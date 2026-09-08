# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Digital Products & Learning Marketplace

**Document Version:** 1.0
**Status:** Product & Development Specification
**Platform Type:** Digital Product Marketplace
**Primary Users:** Customers / Students / Learners
**Management:** Admin Panel
**Payment Gateway:** Razorpay
**Frontend Hosting:** Vercel
**Backend Hosting:** Render
**Content Storage:** Server/Object Storage
**Video Delivery:** Third-party / External Video Links

---

# 1. PRODUCT OVERVIEW

The platform is a digital marketplace where administrators can create, upload, organize, sell, and manage digital educational and informational products.

Users can create accounts using:

* Email and password
* Google Authentication

Users can browse products, view product details, purchase products through Razorpay, and access their purchased digital content from their personal library.

The platform will support products such as:

* PDF files
* ZIP files
* Documents
* Digital books/eBooks
* Study materials
* Notes
* External lecture/video playlists
* Collections of multiple downloadable files

All commercial content and its availability will be controlled through the Admin Panel.

The system must ensure that users can only access purchased content that they are authorized to access.

---

# 2. PRODUCT OBJECTIVES

The primary objectives are:

1. Provide a clean marketplace for selling digital products.
2. Allow administrators to manage the entire catalog without directly modifying the database.
3. Allow users to securely purchase digital products.
4. Automatically grant access after successful payment.
5. Protect downloadable content using expiring links and download limits.
6. Support external lecture/video links without hosting large video files.
7. Provide users with a personal library of purchased products.
8. Provide complete order and payment records.
9. Allow administrators to issue refunds and manage customer access.
10. Provide notifications for important account, purchase, and content events.
11. Provide banners and promotional content managed entirely from the Admin Panel.
12. Maintain an audit trail for important administrative actions.
13. Keep the architecture simple enough to maintain and deploy economically.

---

# 3. CORE PRODUCT MODEL

The platform follows a marketplace model:

```text
Category
   ↓
Product
   ↓
Product Files / Product Content
   ↓
User Purchase
   ↓
Order
   ↓
Payment
   ↓
Access Grant
   ↓
User Library
```

Example:

```text
Category:
Programming

Product:
Complete Java Notes

Content:
- Java Notes.pdf
- Java Programs.zip
- Important Questions.pdf

Price:
₹199

User:
Atul

Purchase:
Successful

Result:
Product appears in Atul's My Library
```

---

# 4. PRODUCT TYPES

The platform must support the following product types.

## 4.1 PDF Product

Example:

```text
Complete HTML Notes
PDF
₹99
```

The administrator uploads a PDF file.

---

## 4.2 ZIP Product

Example:

```text
Web Development Resources
ZIP
₹299
```

The administrator uploads a ZIP archive.

ZIP files may contain:

* PDFs
* Images
* Source code
* Documents
* Study material
* Other permitted digital resources

The ZIP itself is treated as one downloadable asset.

---

## 4.3 Document Product

Supported document formats may include:

* PDF
* DOC
* DOCX
* PPT
* PPTX
* XLS
* XLSX
* TXT

The final allowed extensions must be configurable from the Admin Panel/server configuration.

---

## 4.4 Digital Book

A digital book is treated as a marketplace product containing one or more book files.

Example:

```text
The Complete Java Book

Category:
Programming

Format:
PDF

Price:
₹399
```

---

## 4.5 Lecture Playlist Product

Lecture products will use external video/playlist links.

The platform does NOT need to host the video itself.

Supported external providers may include:

* YouTube
* Vimeo
* Other supported external video platforms

Example:

```text
Complete Java Lecture Series

Lecture 1 → External Video URL
Lecture 2 → External Video URL
Lecture 3 → External Video URL
...
```

The administrator controls these links.

---

# 5. USER ROLES

## 5.1 Guest

A guest can:

* Visit homepage
* Browse categories
* Search products
* View product details
* View prices
* View public product information
* Sign up
* Sign in

A guest cannot:

* Purchase without authentication
* Access purchased files
* Access private lecture links
* View order history
* Access My Library

---

## 5.2 Registered User

A registered user can:

* Manage profile
* Browse products
* Search products
* Purchase products
* View orders
* View payment status
* Access purchased products
* Download purchased files
* Access external lecture content
* View download history
* View lecture access information
* Manage wishlist/favorites
* Receive notifications
* Manage account settings
* Reset/change password
* Manage Google-connected authentication where supported

---

# 6. ADMIN ROLES

The system should support role-based administration.

Recommended roles:

### Super Admin

Full system access.

Can:

* Manage admins
* Manage users
* Manage products
* Manage categories
* Manage orders
* Manage payments
* Manage refunds
* Manage files
* Manage playlists
* Manage banners
* Manage notifications
* View analytics
* Manage settings
* View audit logs

### Admin

Can manage normal operational functions but cannot manage Super Admin permissions.

### Content Manager

Can:

* Create products
* Edit products
* Upload files
* Manage external lectures
* Manage categories
* Publish/unpublish content

Cannot:

* Process refunds
* Manage administrators
* Change sensitive system settings

### Support/Admin Staff

Can:

* View users
* View orders
* View payment information
* Assist customers
* View access status

Sensitive financial/system settings should remain restricted.

---

# 7. AUTHENTICATION

## 7.1 Email Registration

Required fields:

* Name
* Email
* Password
* Confirm Password

Optional:

* Phone number
* Profile image

---

## 7.2 Google Authentication

Users can sign in/sign up using Google.

If a Google account does not already exist:

```text
Google Login
     ↓
Account does not exist
     ↓
Create User
     ↓
Login
```

If the account already exists:

```text
Google Login
     ↓
Existing account
     ↓
Authenticate
     ↓
Login
```

---

# 8. EMAIL VERIFICATION

Email verification should be supported.

Flow:

```text
Registration
     ↓
Verification Email
     ↓
User clicks verification link
     ↓
Account verified
     ↓
User can access full platform functionality
```

The system should prevent abuse of unverified accounts where appropriate.

---

# 9. PASSWORD MANAGEMENT

Users must have:

* Forgot Password
* Reset Password
* Change Password
* Secure password hashing
* Password validation
* Session management
* Logout

Passwords must never be stored as plaintext.

---

# 10. USER PROFILE

The user profile should contain:

```text
Profile
├── Name
├── Email
├── Profile Image
├── Account Status
├── Registration Date
└── Authentication Method
```

Users can update permitted profile fields.

---

# 11. HOMEPAGE

The homepage should be visually attractive and optimized for digital products.

Recommended structure:

```text
Header
↓
Hero Section
↓
Search
↓
Featured Categories
↓
Featured Products
↓
Popular Products
↓
Latest Products
↓
Special Offers
↓
Promotional Banner
↓
Why Choose Us
↓
Footer
```

The Admin Panel must control:

* Hero/banner content
* Promotional banners
* Featured products
* Product visibility
* Category visibility
* Promotional sections

---

# 12. DESIGN SYSTEM

The visual design should be created specifically for this platform rather than copying an existing website.

Recommended visual direction:

### Style

* Modern
* Premium
* Clean
* Trustworthy
* Education-focused
* Professional
* Attractive
* Fast-loading

### Color Direction

Use a modern digital-learning marketplace palette.

Suggested primary:

* Deep indigo / blue-purple

Supporting:

* White
* Soft gray
* Light background shades
* Dark text
* Green for successful payments
* Red for errors/destructive actions
* Orange/yellow for promotional states

The final UI should maintain strong contrast and accessibility.

---

# 13. RESPONSIVE DESIGN

The platform must work on:

* Mobile phones
* Tablets
* Laptops
* Desktop monitors

Breakpoints should be implemented using responsive CSS.

Important areas:

* Product cards
* Navigation
* Checkout
* My Library
* Admin tables
* Forms
* File management
* Product management

Mobile users must not need horizontal scrolling for normal operations.

---

# 14. HEADER

The public header should contain:

```text
Logo
Categories
Search
Wishlist
Cart
Login/Profile
```

When logged in:

```text
Profile
My Library
Orders
Wishlist
Notifications
Account Settings
Logout
```

---

# 15. PRODUCT CATALOG

The catalog allows users to browse all published products.

Each product card should show:

* Cover image
* Product title
* Category
* Product type
* Short description
* Current price
* Original price if discounted
* Discount percentage
* Availability
* Featured status where applicable

---

# 16. CATEGORY SYSTEM

Categories organize products.

Example:

```text
Programming
├── Web Development
├── Java
├── Python
├── C/C++
└── Database

Education
├── Engineering
├── Mathematics
├── Science
└── Competitive Exams
```

Admins can:

* Create categories
* Edit categories
* Delete/deactivate categories
* Set category image
* Set category description
* Control visibility
* Set ordering

---

# 17. PRODUCT SEARCH

Users should be able to search by:

* Product name
* Category
* Description
* Keywords
* Author/instructor where applicable

Search results should support:

* Relevance
* Price
* Newest
* Popularity

---

# 18. PRODUCT FILTERING

Filters may include:

* Category
* Product type
* Price range
* Free/paid
* Newest
* Popular

---

# 19. PRODUCT DETAILS PAGE

Every product must have a dedicated product page.

Recommended structure:

```text
Product Cover

Product Title

Category

Description

Product Type

Price

Original Price

Discount

What's Included

File/Content Information

Lecture Information
(if applicable)

Purchase Button

Add to Wishlist

Product Information

FAQ
(if configured)

Related Products
```

---

# 20. PRODUCT DESCRIPTION

Admin should be able to create rich product descriptions.

Supported content:

* Headings
* Paragraphs
* Lists
* Links
* Basic formatting
* Images where required

Unsafe HTML must not be allowed.

---

# 21. PRODUCT PRICING

Admin can configure:

* Regular price
* Sale price
* Discount
* Free product

Example:

```text
Original Price: ₹499
Sale Price: ₹299
Discount: 40%
```

The system should calculate the final payable amount server-side.

Client-side prices must never be trusted.

---

# 22. COUPON SYSTEM

Admins can create coupons.

Coupon properties:

```text
Coupon Code
Discount Type
Discount Value
Minimum Order Value
Maximum Discount
Start Date
Expiry Date
Usage Limit
Per User Limit
Applicable Products
Applicable Categories
Status
```

Discount types:

* Percentage
* Fixed amount

Example:

```text
WELCOME20
20% OFF
Maximum ₹100
Valid until 30 September
```

---

# 23. PRODUCT BUNDLES

The system should support bundled products.

Example:

```text
Web Development Bundle

HTML Notes
+
CSS Notes
+
JavaScript Notes
+
Projects ZIP

Bundle Price:
₹499
```

A bundle may contain multiple existing products or multiple assets.

---

# 24. CART

Users can add products to a cart.

Cart contains:

```text
Product
Quantity
Price
Discount
Coupon Discount
Final Price
```

Digital products should generally have quantity = 1.

Duplicate purchases should be prevented or handled intelligently.

If the user already owns a product, the UI should show:

```text
Already Purchased
Go to Library
```

instead of allowing an unnecessary duplicate purchase.

---

# 25. CHECKOUT

Checkout must show:

```text
Customer
↓
Products
↓
Subtotal
↓
Discount
↓
Coupon
↓
Tax, if applicable
↓
Final Amount
↓
Razorpay Payment
```

The server must recalculate the final price before creating a payment order.

---

# 26. PAYMENT GATEWAY

Primary gateway:

**Razorpay**

Payment flow:

```text
User selects product
        ↓
Checkout
        ↓
Server validates product/price
        ↓
Create Razorpay Order
        ↓
Open Razorpay Checkout
        ↓
User completes payment
        ↓
Razorpay response
        ↓
Server verifies payment signature
        ↓
Payment marked successful
        ↓
Order marked paid
        ↓
Product access granted
        ↓
User receives confirmation
```

Never grant access solely because the browser reports successful payment.

The server must verify the payment.

---

# 27. PAYMENT STATES

Possible payment states:

```text
CREATED
PENDING
AUTHORIZED
CAPTURED
FAILED
REFUNDED
PARTIALLY_REFUNDED
CANCELLED
```

The exact mapping should follow Razorpay's supported states.

---

# 28. ORDER SYSTEM

Each purchase creates an order.

Order information:

```text
Order ID
User ID
Products
Subtotal
Discount
Coupon
Tax
Final Amount
Payment ID
Payment Status
Order Status
Created At
Updated At
```

Example:

```text
ORD-2026-000124

User:
user@example.com

Product:
Complete Java Notes

Amount:
₹199

Payment:
Successful

Access:
Granted
```

---

# 29. ORDER STATUS

Possible order statuses:

```text
PENDING
PAID
PROCESSING
COMPLETED
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
```

For digital products, `PAID`/`COMPLETED` should normally result in immediate access.

---

# 30. REFUND MANAGEMENT

Admins can initiate refunds through the Admin Panel.

Refund flow:

```text
Order
 ↓
Admin selects Refund
 ↓
Refund amount/reason
 ↓
Confirmation
 ↓
Razorpay Refund
 ↓
Payment status updated
 ↓
Order updated
 ↓
User notified
 ↓
Access revoked where applicable
```

Refund rules must be configurable.

Example:

```text
Full Refund
Partial Refund
Refund + Access Revocation
Refund + Keep Access
```

Only authorized admin roles can perform refunds.

---

# 31. USER LIBRARY

The User Library is the user's purchased-content dashboard.

Example:

```text
My Library

Purchased Products
├── Java Notes
├── Web Development Bundle
├── Python Course
└── Interview Questions
```

Each product displays:

* Product title
* Cover
* Purchase date
* Access status
* Available files
* Download button
* Lecture access
* Progress where applicable

---

# 32. DIGITAL DOWNLOAD SYSTEM

Files must NOT be exposed through permanent public URLs.

The recommended flow is:

```text
User clicks Download
        ↓
Authentication check
        ↓
Purchase/access check
        ↓
Download limit check
        ↓
Generate short-lived signed URL
        ↓
Record download event
        ↓
Allow download
```

---

# 33. EXPIRING DOWNLOAD LINKS

Download links must expire.

Example:

```text
Generated URL
Valid for:
5–15 minutes
```

The exact duration should be configurable.

Expired URLs must become unusable.

Users must request a new link for another download.

---

# 34. DOWNLOAD LIMITS

Admin should be able to configure download limits.

Example:

```text
Product:
Java Notes

Maximum Downloads:
5

User:
Downloaded:
2/5
```

Possible settings:

* Unlimited
* Fixed number
* Per-file limit
* Per-product limit

---

# 35. DOWNLOAD TRACKING

The system should store:

```text
Download ID
User
Product
File
Timestamp
IP address
User/session information where appropriate
Download status
```

Admins can use this for support, abuse detection, and audit purposes.

---

# 36. DOWNLOAD SECURITY

Files should:

* Never be publicly indexed
* Not expose storage credentials
* Use protected storage
* Use signed/temporary URLs
* Require authenticated authorization
* Verify purchase/access before generating links

Direct storage URLs should not be displayed in the frontend.

---

# 37. EXTERNAL VIDEO SYSTEM

The platform does not need to store lecture videos.

Instead:

```text
Admin
 ↓
Creates Lecture
 ↓
Adds External Video URL
 ↓
Publishes Product
 ↓
User Purchases Product
 ↓
User opens lecture
 ↓
Platform verifies access
 ↓
External video opens/embeds
```

---

# 38. LECTURE PLAYLIST STRUCTURE

A lecture product may contain:

```text
Product
│
├── Chapter 1
│   ├── Lecture 1
│   ├── Lecture 2
│   └── Lecture 3
│
├── Chapter 2
│   ├── Lecture 4
│   └── Lecture 5
│
└── Chapter 3
    ├── Lecture 6
    └── Lecture 7
```

Each lecture can contain:

* Title
* Description
* External URL
* Duration
* Thumbnail
* Sort order
* Free preview status
* Published status

---

# 39. LECTURE ACCESS CONTROL

External video links should not simply be displayed to everyone.

The application must check:

```text
Is user authenticated?
        ↓
Does user own the product?
        ↓
Is product active?
        ↓
Is user's access valid?
        ↓
Allow lecture access
```

The external URL should be delivered only after authorization.

Important limitation:

If the external provider allows users to obtain the underlying public video URL, the platform cannot guarantee absolute prevention of link sharing. The platform should therefore enforce application-level access control wherever technically possible.

---

# 40. LECTURE PROGRESS

For supported embedded videos, the system should optionally track:

* Started
* Last watched position
* Completed
* Completion percentage

Example:

```text
Java Lecture 4

Progress:
67%

Resume Lecture
```

If an external provider does not expose sufficient playback APIs, only basic access tracking may be possible.

---

# 41. FREE PREVIEW CONTENT

Admins can mark selected:

* Files
* Lectures
* Product information

as free previews.

Example:

```text
Complete Java Course

Lecture 1 → Free Preview
Lecture 2 → Locked
Lecture 3 → Locked
```

Users can preview before purchasing.

---

# 42. WISHLIST

Users can add products to their wishlist.

Features:

* Add
* Remove
* View wishlist
* Move to cart
* Show product availability
* Show current price

---

# 43. NOTIFICATION SYSTEM

Notifications should be available inside the platform.

Possible notifications:

### Account

* Welcome
* Email verification
* Password reset

### Purchase

* Payment successful
* Order confirmed
* Product access granted
* Payment failed

### Content

* New content added
* Product updated
* New lecture available

### Refund

* Refund initiated
* Refund completed
* Access revoked

### Promotional

* New offer
* Coupon
* Sale
* Featured product

Users should have a notification center.

---

# 44. EMAIL NOTIFICATIONS

Important events should also support email notifications.

Examples:

```text
Welcome Email
Email Verification
Password Reset
Order Confirmation
Payment Confirmation
Refund Confirmation
Important Product Update
```

The email provider should be configurable.

---

# 45. ADMIN NOTIFICATIONS

Admins should receive notifications for important operational events.

Examples:

* New successful order
* Payment failure spike
* Refund request/action
* New registered user
* System/content issue
* Low storage threshold where supported

---

# 46. BANNER MANAGEMENT

Admins can create promotional banners.

Fields:

```text
Title
Subtitle
Image
Button Text
Button URL
Start Date
End Date
Position
Status
Priority
```

Banner types:

* Homepage hero
* Promotional banner
* Category banner
* Campaign banner

Expired banners should automatically stop displaying.

---

# 47. ADMIN DASHBOARD

Dashboard should provide an operational overview.

Recommended cards:

```text
Total Users
Total Products
Total Orders
Successful Payments
Revenue
Refunds
Active Products
Downloads
```

Charts:

* Revenue over time
* Orders over time
* Product sales
* Payment status
* Downloads
* New users

The dashboard must not become unnecessarily complex.

---

# 48. ADMIN PRODUCT MANAGEMENT

Admin can:

* Create product
* Edit product
* Duplicate product
* Publish product
* Unpublish product
* Archive product
* Delete product
* Set price
* Add discount
* Upload files
* Add external lectures
* Assign category
* Add cover image
* Add description
* Set download limits
* Set access rules
* Configure preview content

---

# 49. PRODUCT CREATION FLOW

```text
Admin Dashboard
      ↓
Products
      ↓
Create Product
      ↓
Basic Information
      ↓
Category
      ↓
Product Type
      ↓
Pricing
      ↓
Cover Image
      ↓
Files / Lectures
      ↓
Access Settings
      ↓
Preview Settings
      ↓
SEO Information
      ↓
Save Draft
      ↓
Preview
      ↓
Publish
```

---

# 50. PRODUCT DRAFT SYSTEM

Products should support:

```text
DRAFT
PUBLISHED
UNPUBLISHED
ARCHIVED
```

Draft products must never be purchasable.

---

# 51. PRODUCT AVAILABILITY

Admin can control:

* Published/unpublished
* Sales availability
* Purchase availability
* Download availability
* Lecture availability

Example:

```text
Product Active
Sales Active
Downloads Active
Lectures Active
```

These states should be independently controllable where useful.

---

# 52. FILE MANAGEMENT

Admin file manager should allow:

* Upload
* Replace
* Delete
* Rename
* View metadata
* Attach to product
* Detach from product

Metadata:

```text
File name
File type
File size
Upload date
Storage location
Product association
Status
```

---

# 53. FILE UPLOAD SECURITY

The server must validate:

* File extension
* MIME type
* File size
* Filename
* Upload authorization

Potentially dangerous executable files should be blocked unless explicitly supported.

Uploaded files should not be executable from the web server.

---

# 54. ADMIN USER MANAGEMENT

Admin can view:

```text
User ID
Name
Email
Account status
Registration date
Purchase count
Total spending
Library count
```

Admin actions:

* View user
* Disable account
* Enable account
* View orders
* View purchased products
* View download history
* View access status
* Reset access where permitted

---

# 55. USER ACCOUNT STATUS

Possible statuses:

```text
ACTIVE
SUSPENDED
BANNED
PENDING_VERIFICATION
DELETED
```

Suspended/banned users cannot access protected content.

---

# 56. ADMIN ORDER MANAGEMENT

Admin can:

* Search orders
* Filter orders
* View order details
* View payment
* View customer
* View purchased products
* View access status
* Process refunds
* Review payment failures

Filters:

* Date
* Status
* Payment method
* User
* Product
* Amount

---

# 57. ADMIN PAYMENT MANAGEMENT

Admin can view:

```text
Payment ID
Razorpay Order ID
Razorpay Payment ID
User
Order
Amount
Status
Date
Refund status
```

Payment records should be immutable except for system-generated status updates.

---

# 58. AUDIT LOG

Important admin actions must be logged.

Examples:

```text
Admin created product
Admin changed price
Admin published product
Admin deleted file
Admin issued refund
Admin changed user status
Admin changed access
Admin changed coupon
```

Audit entry:

```text
Actor
Action
Target
Timestamp
IP/device information where appropriate
Old value
New value
```

This is important for accountability and troubleshooting.

---

# 59. USER ↔ ADMIN TRACEABILITY

Every meaningful customer transaction/action must have corresponding backend records that admins can inspect where operationally relevant.

Example:

```text
User Registration
        ↓
User Record
        ↓
Purchase
        ↓
Order
        ↓
Payment
        ↓
Access Grant
        ↓
Download
        ↓
Download History
```

Administrators should be able to trace:

```text
User
 ↓
Orders
 ↓
Payments
 ↓
Purchased Products
 ↓
Access
 ↓
Downloads
```

This requirement is mandatory.

---

# 60. ACCESS CONTROL

Every protected request must verify authorization server-side.

Example:

```text
GET /download/file/123

        ↓

Authenticate User

        ↓

Check Product Ownership

        ↓

Check Product Status

        ↓

Check User Status

        ↓

Check Download Limit

        ↓

Generate Temporary URL

        ↓

Record Download

        ↓

Return URL
```

The frontend must never be considered a security boundary.

---

# 61. DATABASE REQUIREMENTS

A relational database is recommended.

Recommended:

**PostgreSQL**

Core tables/entities:

```text
users
accounts
sessions
admins
roles
permissions

categories
products
product_assets
product_lectures
product_chapters

orders
order_items
payments
refunds

user_library
access_grants

downloads
download_limits

wishlists
wishlist_items

coupons
coupon_usages

notifications
notification_reads

banners

audit_logs

settings
```

---

# 62. USER ENTITY

Example fields:

```text
id
name
email
password_hash
profile_image
email_verified
status
created_at
updated_at
last_login_at
```

---

# 63. PRODUCT ENTITY

Example:

```text
id
title
slug
description
category_id
product_type
cover_image
price
sale_price
is_free
status
is_featured
download_limit
access_duration
created_at
updated_at
published_at
```

---

# 64. PRODUCT ASSET ENTITY

```text
id
product_id
file_name
file_type
file_size
storage_key
download_limit
sort_order
is_preview
status
created_at
updated_at
```

The actual private storage URL should not be stored as a permanently accessible public URL.

---

# 65. LECTURE ENTITY

```text
id
product_id
chapter_id
title
description
external_url
provider
duration
thumbnail
sort_order
is_preview
status
created_at
updated_at
```

---

# 66. ORDER ENTITY

```text
id
order_number
user_id
subtotal
discount
coupon_discount
tax
total
currency
status
created_at
updated_at
```

---

# 67. PAYMENT ENTITY

```text
id
order_id
user_id
razorpay_order_id
razorpay_payment_id
razorpay_signature
amount
currency
status
method
created_at
updated_at
```

Sensitive payment information must not be unnecessarily stored.

---

# 68. ACCESS GRANT ENTITY

```text
id
user_id
product_id
order_id
status
granted_at
expires_at
revoked_at
reason
```

This entity is responsible for determining whether a user currently has access.

---

# 69. DOWNLOAD ENTITY

```text
id
user_id
product_id
asset_id
access_grant_id
download_number
requested_at
completed_at
status
ip_address
user_agent
```

---

# 70. COUPON ENTITY

```text
id
code
type
value
minimum_order
maximum_discount
usage_limit
per_user_limit
starts_at
expires_at
status
created_at
updated_at
```

---

# 71. NOTIFICATION ENTITY

```text
id
user_id
title
message
type
read_at
created_at
```

---

# 72. ADMIN ARCHITECTURE

Recommended Admin Panel sections:

```text
Dashboard

Products
├── All Products
├── Add Product
├── Drafts
└── Archived

Categories

Files

Orders

Payments

Refunds

Users

Coupons

Banners

Notifications

Analytics

Audit Logs

Admins & Roles

Settings
```

---

# 73. ADMIN SIDEBAR

Recommended navigation:

```text
Dashboard
Products
Categories
Files
Orders
Payments
Refunds
Users
Coupons
Banners
Notifications
Analytics
Audit Logs
Admins
Settings
```

The sidebar should change based on admin permissions.

---

# 74. ADMIN PRODUCT TABLE

Columns:

```text
Product
Category
Type
Price
Sales
Status
Created
Actions
```

Actions:

```text
View
Edit
Duplicate
Publish
Unpublish
Archive
Delete
```

---

# 75. ADMIN USER TABLE

Columns:

```text
User
Email
Status
Orders
Spent
Joined
Actions
```

---

# 76. ADMIN ORDER TABLE

Columns:

```text
Order ID
Customer
Product
Amount
Payment
Order Status
Date
Actions
```

---

# 77. ADMIN SEARCH

Admin should be able to search:

* Users
* Products
* Orders
* Payments
* Coupons
* Files

---

# 78. ADMIN FILTERS

Every large dataset should support filters.

Examples:

```text
Status
Date
Category
Product
User
Price
Payment status
Order status
```

---

# 79. ANALYTICS

Basic analytics should include:

### Sales

* Total revenue
* Daily revenue
* Monthly revenue
* Product revenue
* Average order value

### Products

* Best-selling products
* Most downloaded products
* Most purchased categories

### Users

* Total users
* New registrations
* Purchasing users

### Payments

* Successful payments
* Failed payments
* Refunds

---

# 80. SEO

Public product pages should be SEO-friendly.

Each product should support:

```text
SEO Title
SEO Description
Slug
Canonical URL
Open Graph Image
```

Category pages should also support SEO metadata.

The platform should generate:

* Sitemap
* Robots configuration
* Search-engine-friendly URLs

Example:

```text
/products/complete-java-notes
```

instead of:

```text
/product?id=182
```

---

# 81. PERFORMANCE

The platform should prioritize performance.

Requirements:

* Optimized images
* Lazy loading
* Pagination
* Server-side validation
* Efficient database queries
* Caching where useful
* Avoid loading unnecessary admin data
* Avoid exposing large files through application servers when signed object-storage URLs can be used

---

# 82. PAGINATION

Large datasets must use pagination.

Examples:

```text
Products
Users
Orders
Payments
Downloads
Audit logs
Notifications
```

Default:

```text
20–50 records per page
```

Admin may change page size where appropriate.

---

# 83. ERROR HANDLING

The platform should provide clear errors.

Examples:

```text
Payment Failed
Product Unavailable
Download Limit Reached
Download Link Expired
Unauthorized Access
Invalid Coupon
Session Expired
File Not Found
Account Suspended
Refund Failed
```

Errors should be understandable to users without exposing internal server information.

---

# 84. SECURITY REQUIREMENTS

Mandatory security controls:

### Authentication

* Secure password hashing
* Secure sessions
* Google OAuth security
* Email verification
* Password reset tokens with expiration

### Authorization

* Role-based access control
* Server-side permission checks
* Product ownership checks

### Payments

* Razorpay signature verification
* Server-side amount validation
* Webhook verification

### Files

* Private storage
* Signed URLs
* Expiring URLs
* Download limits
* File validation

### Application

* Input validation
* Output escaping
* CSRF protection where applicable
* Rate limiting
* Secure HTTP headers
* Protection against SQL injection
* Protection against XSS
* Protection against unauthorized API access

---

# 85. RATE LIMITING

Rate limiting should apply to sensitive endpoints.

Especially:

```text
Login
Registration
Password reset
OTP/email verification
Coupon validation
Payment creation
Download generation
API endpoints
```

---

# 86. WEBHOOK SYSTEM

Razorpay webhooks should be supported.

Important events may include:

```text
Payment captured
Payment failed
Refund processed
```

Webhook flow:

```text
Razorpay
 ↓
Webhook endpoint
 ↓
Verify webhook signature
 ↓
Find payment/order
 ↓
Update database
 ↓
Grant/revoke/update access
 ↓
Create notification
```

Webhook processing must be idempotent.

The same webhook should not create duplicate orders or duplicate access.

---

# 87. PAYMENT FAILURE HANDLING

If payment fails:

```text
Order remains unpaid
Product access is NOT granted
User can retry payment
```

The system must not accidentally grant content because a checkout session was created.

---

# 88. DUPLICATE PAYMENT PROTECTION

The system must protect against:

* Double clicks
* Multiple payment requests
* Duplicate webhook events
* Browser refresh after payment
* Network retry

Each payment/order must have unique identifiers.

---

# 89. REFUND ACCESS LOGIC

Default behavior:

```text
Refund Successful
       ↓
Access Revoked
       ↓
Future downloads blocked
       ↓
Lecture access blocked
       ↓
Library shows Refunded
```

The Admin Panel may override this behavior if business policy allows keeping access.

---

# 90. CONTENT UPDATE LOGIC

If an administrator replaces a product file:

```text
Existing Product
      ↓
New File Version
      ↓
Existing Purchasers
      ↓
Access to latest permitted version
```

The platform should avoid breaking historical order records.

Optional file versioning may be supported.

---

# 91. PRODUCT DELETION

Purchased products should generally not be physically deleted immediately.

Instead:

```text
Active
 ↓
Archived
 ↓
Hidden from Marketplace
```

Historical order records must remain intact.

---

# 92. USER DELETION

If a user requests account deletion:

* Personal data should be handled according to applicable legal requirements.
* Financial/order records required for accounting or legal purposes should not necessarily be deleted.
* Access should be revoked according to the deletion policy.
* Audit integrity must be maintained.

---

# 93. ADMIN AUDIT REQUIREMENTS

The following should always generate audit records:

* Product creation
* Product deletion/archive
* Price changes
* File upload
* File deletion
* Product publication
* Coupon creation/edit
* Refund
* User suspension
* User restoration
* Access grant
* Access revocation
* Admin role change
* Sensitive setting change

---

# 94. API STRUCTURE

Example REST-style API:

```text
/api/auth/*
/api/users/*
/api/products/*
/api/categories/*
/api/cart/*
/api/checkout/*
/api/orders/*
/api/payments/*
/api/refunds/*
/api/downloads/*
/api/library/*
/api/lectures/*
/api/wishlist/*
/api/coupons/*
/api/notifications/*
/api/admin/*
```

---

# 95. PUBLIC PRODUCT API

Example:

```text
GET /api/products
GET /api/products/:slug
GET /api/categories
GET /api/categories/:slug
```

---

# 96. AUTHENTICATED APIs

Example:

```text
GET /api/me
GET /api/library
GET /api/orders
GET /api/notifications
POST /api/wishlist
DELETE /api/wishlist/:id
```

---

# 97. DOWNLOAD API

Example:

```text
POST /api/downloads/:assetId
```

Server performs:

```text
Authentication
Authorization
Ownership
Product status
Download limit
Generate signed URL
Log download
```

---

# 98. PAYMENT APIs

Example:

```text
POST /api/checkout/create-order
POST /api/payment/verify
POST /api/webhooks/razorpay
```

---

# 99. ADMIN APIs

Example:

```text
GET /api/admin/products
POST /api/admin/products
PATCH /api/admin/products/:id
DELETE /api/admin/products/:id

GET /api/admin/users
PATCH /api/admin/users/:id

GET /api/admin/orders
GET /api/admin/payments

POST /api/admin/refunds

GET /api/admin/audit-logs
```

All admin APIs require appropriate role permissions.

---

# 100. FRONTEND PAGES

Recommended public pages:

```text
/
 /products
 /products/[slug]
 /categories
 /categories/[slug]
 /search
 /login
 /register
 /forgot-password
 /reset-password
 /verify-email
 /cart
 /checkout
 /about
 /contact
 /terms
 /privacy
 /refund-policy
```

---

# 101. USER PAGES

```text
/dashboard
/library
/library/[product]
/orders
/orders/[orderId]
/wishlist
/notifications
/profile
/settings
/security
```

---

# 102. ADMIN PAGES

```text
/admin
/admin/products
/admin/products/new
/admin/products/[id]
/admin/categories
/admin/files
/admin/orders
/admin/orders/[id]
/admin/payments
/admin/refunds
/admin/users
/admin/users/[id]
/admin/coupons
/admin/banners
/admin/notifications
/admin/analytics
/admin/audit-logs
/admin/admins
/admin/settings
```

---

# 103. RECOMMENDED PROJECT STRUCTURE

A practical structure for a modern JavaScript application:

```text
project/
│
├── frontend/
│   ├── public/
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   │
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── styles/
│   │   ├── context/
│   │   └── assets/
│   │
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── validators/
│   │   ├── utils/
│   │   ├── jobs/
│   │   └── config/
│   │
│   └── package.json
│
├── database/
│   ├── migrations/
│   ├── seed/
│   └── schema/
│
├── docs/
│   ├── PRD.md
│   ├── API.md
│   └── SECURITY.md
│
├── .env.example
├── README.md
└── package.json
```

If using a full-stack Next.js implementation, the frontend/backend structure can instead be unified into a single application.

---

# 104. TECHNOLOGY RECOMMENDATION

Because the requested deployment is Vercel + Render and the user requested a basic web technology stack, the recommended implementation is:

## Frontend

* HTML
* CSS
* JavaScript
* Responsive CSS
* Modern component-based UI

## Recommended production framework

**Next.js / React**

This provides:

* Better routing
* SEO
* Performance
* Component reuse
* Vercel compatibility
* API integration

## Backend

* Node.js
* Express.js or Next.js server/API routes

## Database

* PostgreSQL

## ORM

* Prisma or equivalent

## Authentication

* Email/password authentication
* Google OAuth

## Payments

* Razorpay

## Deployment

Frontend:

```text
Vercel
```

Backend:

```text
Render
```

Database:

```text
PostgreSQL hosted through a suitable managed provider
```

Files:

```text
Private object/file storage
```

---

# 105. ENVIRONMENT VARIABLES

Sensitive credentials must be stored as environment variables.

Example:

```text
DATABASE_URL

GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET

AUTH_SECRET

STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY
STORAGE_BUCKET

EMAIL_API_KEY
EMAIL_FROM
```

Never commit secrets to Git.

---

# 106. DEPLOYMENT ARCHITECTURE

Recommended:

```text
                 USERS
                   │
                   ▼
              VERCEL
          Frontend / Next.js
                   │
                   ▼
              BACKEND
               RENDER
                   │
       ┌───────────┼───────────┐
       │           │           │
       ▼           ▼           ▼
 PostgreSQL     Razorpay    Email Service
       │
       ▼
 Private File Storage
```

External lectures:

```text
User
 ↓
Platform Authorization
 ↓
External Video Provider
```

---

# 107. DATABASE BACKUP

Database backups should be enabled through the database provider.

Recommended:

* Automated backups
* Backup retention
* Recovery procedure
* Periodic backup testing

---

# 108. OBSERVABILITY

Production system should maintain:

* Application logs
* Error logs
* Payment logs
* Webhook logs
* Authentication logs
* Download logs
* Admin audit logs

Sensitive secrets must never appear in logs.

---

# 109. LEGAL/POLICY PAGES

The platform should include:

```text
Terms & Conditions
Privacy Policy
Refund Policy
Copyright/DMCA Policy
Digital Product Usage Policy
Contact Page
```

Because the platform sells digital content, the refund policy should clearly explain when purchased digital content is refundable and when access may be revoked.

---

# 110. COPYRIGHT & CONTENT MANAGEMENT

Admins should only upload content that the platform has the legal right to distribute.

The system should provide an administrative record of:

* Product creator/uploader
* Upload timestamp
* Content ownership/source where required

A copyright complaint workflow may be added later.

---

# 111. ACCESS EXPIRATION

The system should support optional product access expiration.

Examples:

```text
Lifetime Access
30 Days
90 Days
1 Year
Custom Date
```

For example:

```text
Purchase:
1 September

Access:
90 Days

Expires:
30 November
```

The user should see:

```text
Access expires in 12 days
```

If lifetime access:

```text
Lifetime Access
```

---

# 112. PRODUCT ACCESS RULES

Every product should have configurable:

```text
Access duration
Download limit
Lecture access
Download permission
Preview permission
```

---

# 113. USER ACCESS STATUS

Library should display:

```text
ACTIVE
EXPIRED
REVOKED
REFUNDED
```

Example:

```text
Java Notes
Purchased: 01 Sep 2026
Access: Lifetime
Status: Active
Downloads: 2/5
```

---

# 114. ADMIN ACCESS MANAGEMENT

Authorized admins should be able to:

* Grant access
* Revoke access
* Extend access
* Restore access
* View access history

Manual access changes must always create audit records.

---

# 115. NOTIFICATION PREFERENCES

Users should optionally control:

```text
Email notifications
Marketing notifications
Purchase notifications
Product notifications
```

Critical security/account notifications should not be disabled.

---

# 116. MOBILE UX

On mobile:

* Bottom/compact navigation may be used
* Cards become single-column
* Checkout becomes stacked
* Tables become cards or horizontally scrollable only where unavoidable
* Admin panel should remain usable but can prioritize desktop
* Buttons must have touch-friendly sizes

---

# 117. ACCESSIBILITY

The website should support:

* Keyboard navigation
* Semantic HTML
* Accessible labels
* Sufficient contrast
* Visible focus states
* Alt text for meaningful images
* Screen-reader-friendly forms

---

# 118. SECURITY AGAINST CONTENT SHARING

The platform should implement reasonable protection against casual sharing.

Controls:

* Expiring download URLs
* Download limits
* Authenticated access
* Access grants
* Download logs
* User-specific PDF watermarking where technically feasible
* Session controls
* Suspicious download detection

Absolute prevention of copying/screenshots/screen recording cannot be guaranteed on a user's device.

---

# 119. PDF WATERMARKING

Optional advanced feature:

For eligible PDFs, dynamically generate a personalized version containing:

```text
Purchased by:
User Name

Email:
user@example.com

Order:
ORD-XXXX

Generated:
Date
```

This can discourage redistribution.

This feature should be implemented only if performance/storage requirements are acceptable.

---

# 120. ANTI-ABUSE

The system should detect suspicious patterns such as:

```text
Very high download frequency
Repeated failed authentication
Repeated download-link generation
Coupon abuse
Multiple payment attempts
```

The system may temporarily rate-limit suspicious accounts.

---

# 121. ADMIN SETTINGS

Admin settings should include:

### General

* Website name
* Logo
* Favicon
* Contact email
* Currency

### Commerce

* Default currency
* Tax configuration
* Coupon settings
* Refund rules

### Content

* Maximum file size
* Allowed file extensions
* Default download limit
* Default access duration

### Notifications

* Email provider
* Notification settings

### Security

* Session duration
* Rate limits
* Admin security settings

---

# 122. CURRENCY

Primary currency:

```text
INR (₹)
```

The system should be designed so additional currencies can be added later.

---

# 123. TAX SUPPORT

The architecture should support tax configuration.

Possible fields:

```text
Tax name
Tax percentage
Tax inclusive/exclusive
```

Actual tax/legal treatment should be configured according to the business's applicable requirements.

---

# 124. PRODUCT STATUS FLOW

```text
DRAFT
  ↓
PUBLISHED
  ↓
UNPUBLISHED
  ↓
ARCHIVED
```

---

# 125. ORDER FLOW

```text
Cart
 ↓
Checkout
 ↓
Razorpay Order
 ↓
Payment
 ↓
Verification
 ↓
Order Paid
 ↓
Access Grant
 ↓
Library
 ↓
Download / Lecture
```

---

# 126. REFUND FLOW

```text
Order
 ↓
Refund Requested/Initiated
 ↓
Admin Review
 ↓
Razorpay Refund
 ↓
Refund Success
 ↓
Order Updated
 ↓
Access Revoked
 ↓
User Notification
```

---

# 127. DOWNLOAD FLOW

```text
My Library
 ↓
Product
 ↓
File
 ↓
Download
 ↓
Authentication
 ↓
Ownership Check
 ↓
Limit Check
 ↓
Temporary Signed URL
 ↓
Download
 ↓
Download Log
```

---

# 128. LECTURE FLOW

```text
My Library
 ↓
Purchased Course/Product
 ↓
Chapter
 ↓
Lecture
 ↓
Authorization
 ↓
External Video
 ↓
Progress Tracking
```

---

# 129. ADMIN CONTENT FLOW

```text
Admin Login
 ↓
Create Category
 ↓
Create Product
 ↓
Upload Files / Add External Videos
 ↓
Configure Pricing
 ↓
Configure Access
 ↓
Configure Download Limits
 ↓
Add Cover/Description
 ↓
Save Draft
 ↓
Preview
 ↓
Publish
 ↓
Product Appears in Marketplace
```

---

# 130. MVP REQUIREMENTS

The first production version MUST include:

### Authentication

* Email registration
* Email login
* Google login
* Email verification
* Password reset
* Logout

### Marketplace

* Homepage
* Categories
* Product listing
* Product details
* Search
* Filters
* Wishlist

### Commerce

* Cart
* Checkout
* Razorpay
* Payment verification
* Orders
* Purchase confirmation

### Content

* PDF
* ZIP
* Documents
* Digital books
* External lecture links

### User

* Dashboard
* My Library
* Orders
* Downloads
* Profile
* Notifications

### Admin

* Dashboard
* Products
* Categories
* Files
* Users
* Orders
* Payments
* Refunds
* Coupons
* Banners
* Notifications
* Analytics
* Audit logs
* Roles/permissions

### Security

* Private files
* Expiring URLs
* Download limits
* Access control
* Server-side payment verification
* Rate limiting
* Audit logs

---

# 131. PHASE 2 FEATURES

After MVP:

* PDF personalization/watermarking
* Advanced analytics
* Advanced recommendation engine
* Product reviews
* Ratings
* Affiliate system
* Referral system
* Subscription products
* Multiple payment gateways
* Automated invoices
* Advanced anti-sharing
* Mobile application
* Advanced course progress
* Certificates
* Multi-language support

Reviews and ratings are intentionally **not part of MVP**, based on the current product decision.

---

# 132. NON-FUNCTIONAL REQUIREMENTS

The platform should be:

### Reliable

Payment and access records must not be lost.

### Secure

Protected content must not be publicly accessible.

### Scalable

The architecture should allow increasing:

* Users
* Products
* Orders
* Files
* Downloads

without rewriting the core system.

### Maintainable

Business logic should be separated from UI code.

### Observable

Important failures must be logged.

### Responsive

The UI must work across modern devices.

---

# 133. CRITICAL BUSINESS RULES

These rules are mandatory.

### Rule 1

A user must be authenticated before purchasing.

### Rule 2

A payment does not automatically mean successful access until the server verifies it.

### Rule 3

Unpaid orders must not provide purchased content.

### Rule 4

Protected files must never have permanent public download URLs.

### Rule 5

Every generated download must respect the user's download limit.

### Rule 6

Every protected lecture requires authorization.

### Rule 7

Refunded access should normally be revoked.

### Rule 8

Admin permissions must be enforced server-side.

### Rule 9

Admin actions affecting important business data must be audited.

### Rule 10

Historical orders and payment records must remain traceable.

### Rule 11

Product deletion should not destroy historical transaction records.

### Rule 12

Client-side prices must never be trusted.

### Rule 13

Razorpay webhooks must be verified and processed idempotently.

### Rule 14

A user must only see products/content for which they have appropriate access.

### Rule 15

External video URLs must be treated as protected application content even though the actual video is hosted elsewhere.

---

# 134. SUCCESS CRITERIA

The platform will be considered successfully implemented when:

1. A new user can register with email.
2. A user can authenticate with Google.
3. A user can browse categories.
4. A user can search products.
5. A user can view product details.
6. A user can add products to a cart.
7. A user can apply a valid coupon.
8. A user can pay through Razorpay.
9. The server verifies the payment.
10. The system creates an order.
11. The system grants product access.
12. The purchased product appears in My Library.
13. The user can generate a temporary download link.
14. Download limits are enforced.
15. Download activity is recorded.
16. The user can access purchased external lectures.
17. Admin can create products.
18. Admin can upload digital files.
19. Admin can add external lecture URLs.
20. Admin can publish/unpublish products.
21. Admin can manage categories.
22. Admin can manage users.
23. Admin can view orders.
24. Admin can view payments.
25. Authorized admin can process refunds.
26. Admin can manage coupons.
27. Admin can manage banners.
28. Admin can send/manage notifications.
29. Admin can view relevant analytics.
30. Admin can view audit logs.
31. Unauthorized users cannot access protected content.
32. Expired download links stop working.
33. Refunded access can be revoked.
34. Historical transactions remain traceable.

---

# 135. FINAL SYSTEM VISION

The finished platform should behave as a complete digital marketplace:

```text
                    DIGITAL MARKETPLACE
                           │
          ┌────────────────┴────────────────┐
          │                                 │
       USER PANEL                       ADMIN PANEL
          │                                 │
          │                                 │
   Browse Products                  Manage Products
   Search                           Upload Files
   Categories                       Add Lectures
   Wishlist                         Manage Categories
   Cart                              Manage Users
   Checkout                          Manage Orders
          │                           Manage Payments
          ▼                           Process Refunds
       RAZORPAY                       Coupons
          │                           Banners
          ▼                           Notifications
       PAYMENT                         Analytics
          │                           Audit Logs
          ▼                           Settings
     ACCESS GRANT
          │
          ├───────────────┐
          │               │
          ▼               ▼
      DOWNLOADS       LECTURES
          │               │
          ▼               ▼
   Expiring URLs     External Videos
   Download Limits   Protected Access
   Download Logs     Progress
```

The platform should therefore function not merely as a file-upload website, but as a **complete digital commerce and content-access system** where the Admin Panel is the central control layer for products, files, pricing, users, orders, payments, access, refunds, promotions, and operational history.

---

# 136. DEVELOPMENT PRIORITY

Recommended implementation order:

```text
PHASE 1
Project Setup
Authentication
Database
Basic UI

        ↓

PHASE 2
Admin Panel
Categories
Product Management
File Management

        ↓

PHASE 3
Marketplace
Search
Product Pages
Wishlist
Cart

        ↓

PHASE 4
Razorpay
Checkout
Payment Verification
Orders

        ↓

PHASE 5
Access Control
User Library
Expiring Downloads
Download Limits

        ↓

PHASE 6
External Lectures
Lecture Access
Progress Tracking

        ↓

PHASE 7
Coupons
Banners
Notifications
Refunds

        ↓

PHASE 8
Analytics
Audit Logs
Security Hardening

        ↓

PHASE 9
Testing
Performance
Deployment
Production Launch
```

---

# 137. FINAL REQUIREMENT

**The Admin Panel is the source of truth for marketplace content and business operations.**

Administrators must be able to manage the complete lifecycle of a digital product:

```text
Create
→ Configure
→ Upload
→ Price
→ Preview
→ Publish
→ Sell
→ Grant Access
→ Monitor
→ Update
→ Unpublish
→ Refund
→ Revoke Access
→ Archive
```

The User Panel consumes this controlled data and must never bypass the authorization, payment, or access-control rules enforced by the backend.

**End of PRD — Version 1.0**
