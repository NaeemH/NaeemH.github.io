source "https://rubygems.org"

# GitHub Pages: pins Jekyll and all supported plugins to the exact
# versions GitHub Pages runs, so local builds match production.
# See https://pages.github.com/versions/
gem "github-pages", group: :jekyll_plugins

# Plugins used by this site (also bundled by github-pages, listed here
# so `bundle exec jekyll` loads them locally).
group :jekyll_plugins do
  gem "jekyll-sitemap"
  gem "jekyll-feed"
  gem "jekyll-seo-tag"
end

# CI-only: link/HTML checking for the PR preview workflow.
group :test do
  gem "html-proofer", "~> 5.0"
end

# Windows and JRuby do not include zoneinfo files, so bundle tzinfo-data.
gem "tzinfo-data", platforms: [:mingw, :mswin, :x64_mingw, :jruby]

# Performance booster for watching directories on Windows.
gem "wdm", "~> 0.1", platforms: [:mingw, :mswin, :x64_mingw]

# Lock http_parser.rb to a version that works with newer Ruby.
gem "http_parser.rb", "~> 0.6.0", platforms: [:jruby]
