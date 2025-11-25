#!/usr/bin/env python3
"""
Download missing blog images and copy local ones
"""

import urllib.request
import os
import shutil
from pathlib import Path
import time

def download_image(url, dest_path):
    """Download an image from URL to destination path"""
    try:
        # Add headers to avoid bot detection
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0'}
        )

        with urllib.request.urlopen(req, timeout=10) as response:
            with open(dest_path, 'wb') as out_file:
                out_file.write(response.read())

        print(f"  ✓ Downloaded: {dest_path.name}")
        return True

    except Exception as e:
        print(f"  ✗ Failed to download {url}: {e}")
        return False

def copy_local_image(src, dest):
    """Copy a local image file"""
    try:
        shutil.copy2(src, dest)
        print(f"  ✓ Copied: {dest.name}")
        return True
    except Exception as e:
        print(f"  ✗ Failed to copy {src}: {e}")
        return False

def main():
    script_dir = Path(__file__).parent
    images_file = script_dir / 'jekyll_output' / 'images_to_download.txt'
    output_dir = script_dir / 'jekyll_output' / 'assets' / 'images' / 'blog'
    output_dir.mkdir(parents=True, exist_ok=True)

    # Local image sources
    local_albums_dir = script_dir / 'Blogger' / 'Albums' / 'Heisencoder'

    print("Downloading and copying blog images...")
    print("="*60)

    with open(images_file) as f:
        urls = [line.strip() for line in f if line.strip()]

    for url in urls:
        # Extract filename from URL
        filename = url.split('/')[-1]

        # Clean up filename
        if '?' in filename:
            filename = filename.split('?')[0]

        dest_path = output_dir / filename

        # Check if we have this image locally
        local_path = local_albums_dir / filename
        if local_path.exists():
            copy_local_image(local_path, dest_path)
        else:
            # Download from URL
            download_image(url, dest_path)
            time.sleep(0.5)  # Be nice to servers

    print("="*60)
    print(f"Images saved to: {output_dir}")

if __name__ == '__main__':
    main()
