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

> *<!-- TODO: 2-3 paragraphs on the failure mode. Story about somebody emailing
> their pubkey in Slack, the operator pasting it into the wrong VMSS, the
> rotation nightmare that follows. Hint: every fresh engineer asks for this.
> -->*

## The right model in one diagram

> *<!-- TODO: ASCII or simple mermaid diagram showing:
>   Terraform → tls_private_key + azurerm_key_vault_secret
>   Human → RBAC (Key Vault Secrets User) → KV secret → akf fetch
>   Human → Azure Bastion → VMSS (port 22)
> Key insight: the private key is never in source control, never in chat,
> never on a workstation longer than needed.
> -->*

## Minimal CDKTF snippet

> *<!-- TODO: ~30 lines of TypeScript showing:
>   - generating tls_private_key
>   - writing public key to vmss admin_ssh_key
>   - writing private key to KV as a secret with content_type 'application/x-pem-file'
>   - role_assignment block granting a group 'Key Vault Secrets User'
> Keep it copy-paste-able. Real names, masked subs.
> -->*

```typescript
// TODO: paste production-shaped snippet here.
// Replace with your actual stack name + group object ID.
```

## What this buys you

- **No key sprawl** &mdash; one private key per VMSS, lives in one place.
- **Auditable access** &mdash; every `get-secret` call shows up in KV diagnostic logs with the user identity.
- **Rotation is `terraform apply`** &mdash; bump the `tls_private_key` resource, re-run, done.
- **PIM-compatible** &mdash; the role assignment can be marked PIM-eligible so humans elevate to access the key just-in-time.
- **No shared keys in puppet/ansible** &mdash; the only thing in config management is the public key fingerprint, if anything.

## The operator side: `akf`

> *<!-- TODO: 2-3 paragraphs introducing the tool. Note that the post +
> the tool are intentionally complementary &mdash; post explains the infra
> pattern, tool removes the daily-driver friction.
> -->*

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

> *<!-- TODO: bulleted list. Drafts:
>   - KV name length cap (24 chars) bites when you template names
>   - Bastion *Standard* SKU minimum for native-client tunneling
>   - VMSS image must have password auth disabled or this whole model is theater
>   - Don't store the private key with content_type other than 'application/x-pem-file' — KV will let you, but tools may not filter it
>   - SIG image generation mismatch (Gen1 vs Gen2) — separate post material
> -->*

## Further reading

- [Azure Bastion native client](https://learn.microsoft.com/en-us/azure/bastion/connect-native-client-windows)
- [Key Vault RBAC guide](https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide)
- [Terraform `tls_private_key`](https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key)
- [CDKTF docs](https://developer.hashicorp.com/terraform/cdktf)

---

*Found a mistake or want to discuss? Open an issue at
[`NaeemH/azkv-ssh-fetch`](https://github.com/NaeemH/azkv-ssh-fetch/issues) or
ping me on [LinkedIn](https://www.linkedin.com/in/naeem-hossain).*
