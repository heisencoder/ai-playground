# GitHub Pages Setup & Troubleshooting

## Your Current Setup

You have:
- Separate repository: `heisencoder/blog`
- Submodule in `heisencoder.github.io` pointing to the blog repo

This is causing GitHub Pages to use the wrong theme and potentially fail.

## The Problem

GitHub Pages has strict limitations:
1. **Limited plugins**: Only specific plugins are allowed
2. **Build process**: Different from local Jekyll builds
3. **Submodule complexity**: May not work as expected with GitHub Pages

## Solution Options

### Option 1: Standalone Blog Repository (Recommended if using heisencoder/blog)

If you want to keep the blog in a separate `heisencoder/blog` repository:

**1. Update Configuration**

Replace `_config.yml` in the `heisencoder/blog` repo with this:

```yaml
title: Heisencoder
description: "Technical blog on software development, cryptography, and security"
url: "https://heisencoder.github.io"
baseurl: "/blog"
repository: "heisencoder/blog"

markdown: kramdown
remote_theme: mmistakes/minimal-mistakes@4.26.2
minimal_mistakes_skin: "default"

plugins:
  - jekyll-feed
  - jekyll-sitemap
  - jekyll-seo-tag
  - jekyll-include-cache
  - jekyll-paginate
  - jekyll-gist

github: [metadata]

permalink: /:year/:month/:day/:title/

defaults:
  - scope:
      path: ""
      type: posts
    values:
      layout: single
      author_profile: true
      read_time: true
      comments: false
      share: true
      related: true

author:
  name: "Matthew V Ball"
  bio: "Software engineer focused on security, cryptography, and developer tools"
  links:
    - label: "GitHub"
      icon: "fab fa-fw fa-github"
      url: "https://github.com/heisencoder"
```

**2. Update Gemfile**

Replace `Gemfile` with:

```ruby
source "https://rubygems.org"
gem "github-pages", group: :jekyll_plugins
gem "webrick", "~> 1.8"
```

**3. Enable GitHub Pages**

In the `heisencoder/blog` repository:
1. Go to Settings → Pages
2. Source: Deploy from branch `main`
3. Save

**4. Access your blog at:**
`https://heisencoder.github.io/blog`

### Option 2: Direct Integration (Recommended for simplicity)

Instead of a separate repo + submodule, put the blog directly in `heisencoder.github.io`:

**1. Remove the submodule approach**

```bash
cd heisencoder.github.io
git rm -r blog  # Remove submodule reference
rm -rf .git/modules/blog
```

**2. Copy blog files directly**

```bash
# Copy from your ai-playground migration
cp -r /path/to/ai-playground/docs/Takeout/blog_site blog/
```

**3. Update _config.yml**

Use the same configuration as Option 1, but with:
```yaml
baseurl: "/blog"
repository: "heisencoder/heisencoder.github.io"
```

**4. Commit and push**

```bash
git add blog/
git commit -m "Add blog subdirectory"
git push origin main
```

**5. GitHub Pages should already be enabled** on `heisencoder.github.io`

### Option 3: Blog at Root of heisencoder.github.io

If you want the blog at `heisencoder.github.io` (no /blog path):

**1. Move all blog files to root**

```bash
cd heisencoder.github.io
mv blog/_posts ./
mv blog/_pages ./
mv blog/_data ./
mv blog/assets ./
mv blog/_config.yml ./
# etc.
```

**2. Update _config.yml**

```yaml
baseurl: ""  # Empty for root
url: "https://heisencoder.github.io"
```

## Debugging Build Errors

### Get the full error message

1. Go to your repository on GitHub
2. Click "Actions" tab
3. Click on the failed build
4. Look for the complete error message

### Common Errors and Fixes

**Error: "Theme not found"**
- Make sure you're using `remote_theme: mmistakes/minimal-mistakes@4.26.2`
- Not `theme: minimal-mistakes-jekyll`

**Error: "Unknown plugin"**
- Remove any plugins not in the GitHub Pages whitelist
- Only use: jekyll-feed, jekyll-sitemap, jekyll-seo-tag, jekyll-include-cache, jekyll-paginate, jekyll-gist

**Error: "Liquid syntax error"**
- Check your posts for unescaped `{{` or `{%` in content
- Wrap code blocks properly

**Build succeeds but site looks wrong**
- Check `baseurl` matches your URL structure
- Verify `url` is correct
- Check that `remote_theme` is specified

## Testing Locally (GitHub Pages Compatible)

To test exactly how GitHub Pages will build your site:

```bash
cd blog/  # or wherever your blog files are

# Use the GitHub Pages gem
bundle install
bundle exec jekyll serve --baseurl /blog

# View at: http://localhost:4000/blog
```

## Files I've Created for You

In `docs/Takeout/blog_site/`:

1. **_config.yml.gh-pages** - GitHub Pages compatible config
2. **Gemfile.gh-pages** - GitHub Pages compatible Gemfile

Use these to replace your current files.

## Next Steps

1. **Choose which option above** fits your desired setup
2. **Share the complete error message** from GitHub Actions so I can help debug
3. **Confirm your repository structure**:
   - Is the blog in `heisencoder/blog` or `heisencoder/heisencoder.github.io`?
   - Do you want it at `/blog` path or root?

4. Once we confirm the setup, I'll help fix any remaining issues

## Quick Fix (Most Likely Solution)

Based on your error, try this immediately:

**In your blog repository, replace `_config.yml` with:**

```bash
# Copy the GitHub Pages compatible config
cp _config.yml.gh-pages _config.yml

# Copy the GitHub Pages compatible Gemfile
cp Gemfile.gh-pages Gemfile

# Commit and push
git add _config.yml Gemfile
git commit -m "Use GitHub Pages compatible configuration"
git push origin main
```

Then check the build again in GitHub Actions.

Let me know the results and we'll continue troubleshooting!
