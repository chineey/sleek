# SLEEK Magazine — Image Specifications & Guidelines

This document outlines the optimal resolutions, aspect ratios, and guidelines for images uploaded across the SLEEK platform and Admin Panel.

---

## Quick Reference Table

| Section | Aspect Ratio | Optimal Resolution | Minimum Resolution | Orientation | Recommended Format |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Cover Background Photo** | **16:10** | **1920 × 1200 px** *(or 1600 × 1000 px)* | 1600 × 1000 px | Landscape | JPG / PNG / WebP |
| **Articles Feed Photo** | **4:3** | **1600 × 1200 px** *(or 1200 × 900 px)* | 1200 × 900 px | Landscape | JPG / PNG / WebP |
| **Shop Products Photo** | **9:16** | **1080 × 1920 px** *(or 900 × 1600 px)* | 900 × 1600 px | Portrait (Vertical) | JPG / PNG / WebP |

---

## Detailed Specifications

### 1. Cover Background Photo
- **Usage**: Main magazine cover displayed at the top of the homepage (`#cover-hero`).
- **Aspect Ratio**: `16:10` (Landscape).
- **Optimal Upload**: `1920 × 1200 px` (Retina / Ultra HD) or `1600 × 1000 px`.
- **Canvas Output Size**: `1600 × 1000 px`.
- **Notes**: Because text overlays (Title, Issue Number, Tagline) sit on top of the cover, choose images where key focal subjects are well balanced against the dark gradient overlay.

### 2. Articles Editorial Photo
- **Usage**: Magazine editorial cards, featured story thumbnails, and reader view hero images.
- **Aspect Ratio**: `4:3` (Classic Editorial Landscape).
- **Optimal Upload**: `1600 × 1200 px` or `1200 × 900 px`.
- **Canvas Output Size**: `1200 × 900 px`.
- **Notes**: High-contrast fashion photography and editorial portraits look best. Ensure subjects are centered within the frame so they look balanced when cropped.

### 3. Shop Products Photo
- **Usage**: Shop sleek product cards, physical magazine edition displays, and shop checkout preview.
- **Aspect Ratio**: `9:16` (Full Portrait / Mobile Story format).
- **Optimal Upload**: `1080 × 1920 px` or `900 × 1600 px`.
- **Canvas Output Size**: `900 × 1600 px`.
- **Notes**: Vertical orientation matches mobile screens and magazine print mockups. Frame the physical copy or merchandise clearly in the upper-to-middle area.

---

## Best Practices
1. **Upload High-Resolution Originals**:
   - The built-in interactive cropping tool lets you drag and zoom to fit the exact framing. Starting with a high-resolution source file guarantees sharp results without blurriness or pixelation.
2. **File Formats**:
   - Standard `.jpg`, `.jpeg`, `.png`, and `.webp` are supported.
3. **Cloudinary Optimization**:
   - All cropped images uploaded via the Admin Panel are automatically compressed (`quality: auto:good`) and served globally over Cloudinary's CDN for instant loading speeds.
