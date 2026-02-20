# Milestone 3.5 - Image Uploads & Media

## Problem Statement
Visual content is essential for social media engagement. Users need to upload, display, and interact with images in posts and profiles.

## Success Metrics
- Users can upload images when creating posts
- Images display properly in post cards
- Image lightbox provides full-screen viewing
- Gallery navigation for multiple images
- Image optimization for performance
- Profile avatar upload works

## Non-Goals
- Video uploads (Phase 4)
- Image filters/editing (Phase 4)
- Advanced image CDN (Phase 4)
- Bulk uploads (Phase 4)

## Items

### Item 3.5.1 - Image Upload Service
**Type:** Feature
**Description:** Create image upload service with validation and processing.
**Acceptance Criteria:**
- ImageUploadService with methods: uploadImage, validateImage, getImageUrl
- File validation (type: jpg, png, gif, webp; size: max 5MB)
- Image dimensions validation
- Multiple image support (up to 4 per post)
- Progress tracking
- Error handling for failed uploads
- Mock upload for development (base64 or blob URL)
**Passes:** false

### Item 3.5.2 - Image Upload Component
**Type:** Feature
**Description:** Create image upload UI for post creation.
**Acceptance Criteria:**
- Drag and drop zone
- Click to browse files
- Image preview before upload
- Remove image option
- Multiple image support
- Upload progress indicator
- Error messages for invalid files
- Maximum file size warning
**Passes:** false

### Item 3.5.3 - Image Gallery Component
**Type:** Feature
**Description:** Create gallery display for posts with multiple images.
**Acceptance Criteria:**
- Grid layout for multiple images (2x2, 1+2, etc.)
- Single image full width
- Hover effect on images
- Click to open lightbox
- Image count badge for 3+ images
- Responsive grid adjustment
**Passes:** false

### Item 3.5.4 - Image Lightbox Component
**Type:** Feature
**Description:** Implement full-screen image lightbox with navigation.
**Acceptance Criteria:**
- Full-screen overlay
- Image centered with max dimensions
- Navigation arrows for multiple images
- Image counter (1 of 4)
- Zoom functionality (click or pinch)
- Download button
- Close button and ESC key
- Swipe gestures for mobile
**Passes:** false

### Item 3.5.5 - Avatar Upload
**Type:** Feature
**Description:** Add avatar upload functionality to profile edit.
**Acceptance Criteria:**
- Avatar click to upload new image
- Crop to square/circle preview
- File validation (max 2MB)
- Progress indicator
- Preview before save
- Revert option
- Default avatar fallback
- Update in real-time across app
**Passes:** false

### Item 3.5.6 - Media Optimization
**Type:** Feature
**Description:** Implement image optimization for performance.
**Acceptance Criteria:**
- Resize images to max dimensions
- Compress images for web
- Lazy loading for below-fold images
- Placeholder/blur while loading
- WebP conversion (optional)
- Responsive images (srcset)
**Passes:** false

## Affected Files
- `src/app/shared/services/image-upload.service.ts`
- `src/app/shared/components/image-upload/image-upload.component.ts`
- `src/app/shared/components/image-gallery/image-gallery.component.ts`
- `src/app/shared/components/image-lightbox/image-lightbox.component.ts`
- `src/app/shared/components/create-post/create-post.component.ts`
- `src/app/pages/profile/profile-edit/profile-edit.component.ts`

## Affected Dependencies
- None (native APIs)

## Notes
- Use FileReader API for previews
- Prepare for real image hosting API
- Consider compression libraries
