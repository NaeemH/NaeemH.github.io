---
title: "Why your VMSS SSH keys belong in Key Vault (and how to set it up in CDKTF)"
subtitle: "Stop emailing public keys around. Generate, store, and grant — all from Terraform."
description: "A practical CDKTF walkthrough for managing VMSS SSH access through Azure Key Vault and Bastion, plus the operator tool that uses it daily."
date: 2026-06-22
tags: [azure, terraform, cdktf, key-vault, bastion, vmss]
reading_time: 8
---

> **TL;DR** &mdash; The right model for human SSH access to a Linux fleet on Azure is:
> generate the keypair inside Terraform, store the private key in Key Vault, grant
> humans `Key Vault Secrets User` via RBAC, and have them connect through Azure
> Bastion. This post walks through the CDKTF wiring and shares
> [`azkv-ssh-fetch`](https://pypi.org/project/azkv-ssh-fetch/) &mdash; a CLI that
> turns the operator side of this pattern into a single command.

## The "upload my public key" antipattern

The pattern I see at almost every company goes like this. A new engineer needs
SSH access to a Linux scale set. They generate a keypair on their laptop, paste
the public half into Slack, and an operator copies it into the VMSS
`admin_ssh_key` block &mdash; or worse, runs a one-off `az vmss extension` to
inject it into a live fleet. Multiply that by every engineer and every scale set.

Three things rot immediately:

- **Sprawl.** Nobody knows which keys are authorized on which fleet. The
  `admin_ssh_key` list grows append-only, because removing an entry risks
  locking out someone who is still using it.
- **No rotation story.** The private keys live on laptops forever. When someone
  leaves, their key stays trusted until a human remembers to prune it by hand.
- **No audit trail.** "Who SSH'd into prod last Tuesday?" has no answer, because
  access is keyed to a credential nobody ever tracked.

And every fresh engineer asks for exactly this workflow, so the antipattern
reproduces itself faster than you can write down the alternative.

## The right model in one diagram

```text
  ┌───────────────────────── Terraform (CDKTF) ─────────────────────────┐
  │                                                                      │
  │   tls_private_key ──┬── public key  ──▶  VMSS admin_ssh_key          │
  │                     └── private key ──▶  Key Vault secret (PEM)      │
  │                                                                      │
  │   role_assignment: "Key Vault Secrets User"  ──▶  on-call AAD group  │
  └──────────────────────────────────────────────────────────────────────┘

  Operator (just-in-time):

     akf fetch ──▶ [RBAC check] ──▶ Key Vault secret ──▶ ~/.ssh/key (0600)
                                                            │
                                                            ▼
                       Azure Bastion tunnel ──▶ VMSS instance :22
```

The key insight: the private key is generated inside Terraform state, stored
once in Key Vault, and pulled to a workstation just-in-time. It is never in
source control, never in a chat message, and never on a laptop longer than the
length of a session.

## Minimal CDKTF snippet

Here is the whole pattern in one stack. Names are real-shaped; drop in your own
Key Vault, image, and the object ID of the AAD group that should hold access.

```typescript
import { PrivateKey } from "@cdktf/provider-tls/lib/private-key";
import { KeyVaultSecret } from "@cdktf/provider-azurerm/lib/key-vault-secret";
import { RoleAssignment } from "@cdktf/provider-azurerm/lib/role-assignment";
import { LinuxVirtualMachineScaleSet } from "@cdktf/provider-azurerm/lib/linux-virtual-machine-scale-set";

// 1. Generate the keypair inside Terraform state — never on a laptop.
const sshKey = new PrivateKey(this, "vmss-ssh", {
  algorithm: "RSA",
  rsaBits: 4096,
});

// 2. Hand the *public* half to the scale set's admin user.
new LinuxVirtualMachineScaleSet(this, "vmss", {
  name: "prod-myteam-vmss",
  // ...sku, instances, sourceImageId, network config omitted...
  adminUsername: "azureuser",
  adminSshKey: [{ username: "azureuser", publicKey: sshKey.publicKeyOpenssh }],
  disablePasswordAuthentication: true,
});

// 3. Store the *private* half in Key Vault as a PEM secret.
const secret = new KeyVaultSecret(this, "vmss-ssh-secret", {
  name: "my-vmss-ssh",
  keyVaultId: keyVault.id,
  value: sshKey.privateKeyPem,
  contentType: "application/x-pem-file",
});

// 4. Grant humans read access via RBAC — no access policies, no shared creds.
new RoleAssignment(this, "ssh-readers", {
  scope: secret.resourceManagerId,
  roleDefinitionName: "Key Vault Secrets User",
  principalId: onCallGroupObjectId, // an AAD group, ideally PIM-eligible
});
```

The private key never leaves Terraform except into Key Vault. No engineer ever
types `ssh-keygen`; no public key is ever pasted anywhere.

## What this buys you

- **No key sprawl** &mdash; one private key per VMSS, lives in one place.
- **Auditable access** &mdash; every `get-secret` call shows up in KV diagnostic logs with the user identity.
- **Rotation is `terraform apply`** &mdash; bump the `tls_private_key` resource, re-run, done.
- **PIM-compatible** &mdash; the role assignment can be marked PIM-eligible so humans elevate to access the key just-in-time.
- **No shared keys in puppet/ansible** &mdash; the only thing in config management is the public key fingerprint, if anything.

## The operator side: `akf`

The infrastructure pattern above is only half the story. Once the private key
lives in Key Vault behind RBAC, someone still has to pull it, drop it on disk
with the right permissions, and pipe it through Bastion to reach an instance
that has no public IP. Done by hand that is a six-line snippet every engineer
re-types &mdash; and gets subtly wrong: wrong file mode, key left on disk after
the session, wrong `--target-id`.

`azkv-ssh-fetch` (`akf`) is the operator-side companion to this post: the post
explains the infra pattern, the tool removes the daily-driver friction. It is
deliberately dumb &mdash; it does not manage any infrastructure, it just
consumes it. If your Terraform follows the model above, `akf` works against it
with zero extra configuration.

The operator workflow described above used to be a six-line shell snippet that
every engineer re-typed (and got wrong) every time. I wrote
[`azkv-ssh-fetch`](https://pypi.org/project/azkv-ssh-fetch/) to remove the
boilerplate:

```bash
pipx install azkv-ssh-fetch

# Find the SSH-shaped secrets in a vault
akf list --vault prod-myteam-kv

# Pull a key to ~/.ssh/<name> with mode 0600 (atomic)
akf fetch --vault prod-myteam-kv my-vmss-ssh

# Fetch + Bastion SSH in one command (key is shredded on disconnect by default)
akf connect \
  --vault prod-myteam-kv \
  --secret my-vmss-ssh \
  --bastion my-bastion --bastion-rg my-bastion-rg \
  --target-id "/subscriptions/.../virtualMachineScaleSets/my-vmss/virtualMachines/0"
```

Source: [github.com/NaeemH/azkv-ssh-fetch](https://github.com/NaeemH/azkv-ssh-fetch) &middot; License: MIT.

## Gotchas

A few things that bit me setting this up:

- **Key Vault name length.** Vault names cap at 24 characters. If you template
  them as `<env>-<team>-<region>-kv` you will blow the budget fast &mdash; settle
  the naming scheme before you scale it out.
- **Bastion SKU.** Native-client tunneling (`az network bastion ssh` and the
  `akf connect` path) needs the **Standard** SKU. Basic only gives you the
  browser portal, which you cannot script against.
- **Password auth must be off.** Set `disablePasswordAuthentication: true` on the
  scale set. If the image still accepts passwords, the whole key-in-vault model
  is theater.
- **Content type matters.** Store the private key with
  `content_type: "application/x-pem-file"`. Key Vault will accept any content
  type, but tooling (including `akf list`) filters on it to tell SSH secrets
  apart from everything else in the vault.
- **Gen1 vs Gen2 images.** A generation mismatch between your Shared Image
  Gallery version and the VMSS SKU fails the deploy in a way that looks
  unrelated to SSH &mdash; that one is its own post.

## Further reading

- [Azure Bastion native client](https://learn.microsoft.com/en-us/azure/bastion/connect-native-client-windows)
- [Key Vault RBAC guide](https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide)
- [Terraform `tls_private_key`](https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key)
- [CDKTF docs](https://developer.hashicorp.com/terraform/cdktf)

---

*Found a mistake or want to discuss? Open an issue at
[`NaeemH/azkv-ssh-fetch`](https://github.com/NaeemH/azkv-ssh-fetch/issues) or
ping me on [LinkedIn](https://www.linkedin.com/in/naeem-hossain).*
