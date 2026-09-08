-- DigiMart seed data (idempotent-ish: skips if admin already exists)
DO $$
BEGIN
IF EXISTS (SELECT 1 FROM users WHERE email = 'admin@digimart.test') THEN
  RAISE NOTICE 'Seed already applied, skipping';
  RETURN;
END IF;

-- Users
INSERT INTO users (name, email, password_hash, role, status, auth_method) VALUES
 ('Super Admin', 'admin@digimart.test', 'a21136781dd697cadc7de5ed2b69fba9:4286e0b20bce9bd05afa04347a71937a45774aea3aa1508cde6b2a432f1d13abdec457ea74c273a0242dfb88b69fbcc542825982a4cf9ec53c24e308d2d8f7ba', 'super_admin', 'ACTIVE', 'email'),
 ('Atul Sharma', 'atul@digimart.test', 'a554a8e721f98c9f119a4e65eafd6353:cea1c44546132b7045b45cdf4fb56ac7349e368f21d305af59febbd29704cd9468569dc84654152852e844759c70196a0e1a9ff6f0e57053bac7c394e1a347d8', 'user', 'ACTIVE', 'email');

-- Categories
INSERT INTO categories (name, slug, description, emoji, sort_order) VALUES
 ('Programming', 'programming', 'Java, Python, Web Development, C/C++ and more', '💻', 1),
 ('Web Development', 'web-development', 'HTML, CSS, JavaScript, frameworks and projects', '🌐', 2),
 ('Engineering', 'engineering', 'Core engineering subjects and study material', '⚙️', 3),
 ('Mathematics', 'mathematics', 'Maths notes, formula books and solved papers', '📐', 4),
 ('Competitive Exams', 'competitive-exams', 'Interview prep, aptitude and exam material', '🏆', 5);

-- Products
INSERT INTO products (title, slug, short_description, description, category_id, product_type, cover_image, price, sale_price, is_free, status, is_featured, download_limit, access_days, sales_count, published_at) VALUES
 ('Complete Java Notes', 'complete-java-notes',
  'Handwritten-style complete Java notes: core, OOP, collections, streams & JDBC.',
  E'Everything you need to master Java in one beautifully organized PDF pack.\n\nWhat you will learn:\n- Core Java syntax and fundamentals\n- Object-oriented programming in depth\n- Collections framework with examples\n- Streams, lambdas and functional programming\n- JDBC and database connectivity\n\nIncludes solved programs and important interview questions.',
  1, 'PDF', '/images/covers/java-notes.jpg', 499, 199, false, 'PUBLISHED', true, 5, NULL, 34, now()),
 ('Web Development Resources Bundle', 'web-development-resources-bundle',
  'A mega ZIP pack: HTML/CSS/JS cheatsheets, 10 projects with source code and assets.',
  E'A complete toolbox for aspiring web developers.\n\nInside the ZIP:\n- HTML5 & CSS3 cheatsheets\n- JavaScript ES6+ reference\n- 10 real projects with full source code\n- Icons, fonts and starter templates\n\nOne download, endless practice.',
  2, 'ZIP', '/images/covers/webdev-bundle.jpg', 799, 299, false, 'PUBLISHED', true, 5, NULL, 21, now()),
 ('Complete Python Course (Lecture Series)', 'complete-python-course',
  '40+ hours of Python lectures — from basics to projects, streamed from external playlists.',
  E'A structured video course covering Python from zero to job-ready.\n\nCurriculum:\n- Chapter 1: Python basics & setup\n- Chapter 2: Data structures & functions\n- Chapter 3: OOP and real projects\n\nLectures are delivered via protected external video links. Watch anytime from your library.',
  1, 'COURSE', '/images/covers/python-course.jpg', 1499, 599, false, 'PUBLISHED', true, 0, 365, 55, now()),
 ('Complete HTML Notes', 'complete-html-notes',
  'Free starter PDF: every HTML tag explained with examples.',
  'Perfect for absolute beginners. Every HTML element, attribute, and best practice explained with copy-paste examples.',
  2, 'PDF', '/images/covers/html-notes.jpg', 99, NULL, true, 'PUBLISHED', false, 3, NULL, 87, now()),
 ('Coding Interview Questions Pack', 'coding-interview-questions-pack',
  '500+ solved interview questions: DSA, DBMS, OS, networks + HR round guide.',
  E'Crack your next interview with this curated pack.\n\n- 300 DSA problems with solutions\n- 100 DBMS/OS/CN questions\n- 100 HR & behavioural answers\n- Company-wise question lists',
  5, 'DOCUMENT', '/images/covers/interview-questions.jpg', 599, 349, false, 'PUBLISHED', true, 5, NULL, 42, now()),
 ('Engineering Mathematics eBook', 'engineering-mathematics-ebook',
  'The complete M1–M3 digital book with 1200+ solved problems.',
  'A single beautifully typeset eBook covering Engineering Mathematics I, II and III with 1200+ fully solved problems and previous-year papers.',
  4, 'EBOOK', '/images/covers/math-ebook.jpg', 399, NULL, false, 'PUBLISHED', false, 5, NULL, 18, now()),
 ('Advanced React Patterns (Draft)', 'advanced-react-patterns',
  'Deep dive into modern React patterns — coming soon.',
  'Coming soon.',
  2, 'PDF', NULL, 699, NULL, false, 'DRAFT', false, 5, NULL, 0, NULL);

-- Assets
INSERT INTO product_assets (product_id, file_name, file_type, file_size, storage_key, is_preview, sort_order) VALUES
 (1, 'Java Notes - Full.pdf', 'pdf', 8482304, 'seed-java-notes-full.pdf', false, 1),
 (1, 'Java Programs.zip', 'zip', 2411520, 'seed-java-programs.zip', false, 2),
 (1, 'Java - Sample Chapter.pdf', 'pdf', 512000, 'seed-java-sample.pdf', true, 3),
 (2, 'WebDev Resources.zip', 'zip', 52428800, 'seed-webdev-resources.zip', false, 1),
 (3, 'Python Course - Slides.pdf', 'pdf', 10485760, 'seed-python-slides.pdf', false, 1),
 (4, 'Complete HTML Notes.pdf', 'pdf', 3145728, 'seed-html-notes.pdf', false, 1),
 (5, 'Interview Questions Pack.pdf', 'pdf', 6291456, 'seed-interview-pack.pdf', false, 1),
 (5, 'HR Round Guide.docx', 'docx', 819200, 'seed-hr-guide.docx', false, 2),
 (6, 'Engineering Mathematics.pdf', 'pdf', 15728640, 'seed-math-ebook.pdf', false, 1);

-- Lectures (Python course)
INSERT INTO product_lectures (product_id, chapter_title, title, external_url, provider, duration, sort_order, is_preview) VALUES
 (3, 'Chapter 1: Getting Started', 'Introduction & Course Overview', 'https://www.youtube.com/watch?v=_uQrJ0TkZlc', 'YouTube', '06:14', 1, true),
 (3, 'Chapter 1: Getting Started', 'Installing Python & VS Code', 'https://www.youtube.com/watch?v=YYXdXT2l-Gg', 'YouTube', '12:40', 2, false),
 (3, 'Chapter 1: Getting Started', 'Variables & Data Types', 'https://www.youtube.com/watch?v=cQT33yu9pY8', 'YouTube', '24:12', 3, false),
 (3, 'Chapter 2: Core Python', 'Lists, Tuples & Dictionaries', 'https://www.youtube.com/watch?v=W8KRzm-HUcc', 'YouTube', '31:05', 4, false),
 (3, 'Chapter 2: Core Python', 'Functions & Modules', 'https://www.youtube.com/watch?v=9Os0o3wzS_I', 'YouTube', '27:48', 5, false),
 (3, 'Chapter 3: OOP & Projects', 'Classes & Objects', 'https://www.youtube.com/watch?v=ZDa-Z5JzLYM', 'YouTube', '53:06', 6, false),
 (3, 'Chapter 3: OOP & Projects', 'Final Project: Expense Tracker', 'https://www.youtube.com/watch?v=HTLu2DFOdTg', 'YouTube', '44:20', 7, false);

-- Coupons
INSERT INTO coupons (code, type, value, min_order, max_discount, usage_limit, per_user_limit, expires_at, is_active) VALUES
 ('WELCOME20', 'PERCENT', 20, 0, 100, NULL, 1, now() + interval '365 days', true),
 ('FLAT50', 'FIXED', 50, 299, NULL, 100, 1, now() + interval '90 days', true);

-- Banners
INSERT INTO banners (title, subtitle, image, button_text, button_url, position, priority, is_active) VALUES
 ('Premium Notes, eBooks & Courses for Serious Learners', 'Download study material, code packs and digital books — or stream lecture series. Everything lives forever in your personal library.', '/images/hero.jpg', 'Browse Marketplace', '/products', 'HERO', 10, true),
 ('New here? Get 20% off your first order', 'Use coupon WELCOME20 at checkout — up to ₹100 off.', NULL, 'Shop now', '/products', 'PROMO', 5, true),
 ('Flat ₹50 off orders above ₹299', 'Apply coupon FLAT50 at checkout.', NULL, 'Grab the deal', '/products?sort=popular', 'PROMO', 4, true);

-- A sample paid order + grant for the demo user (Atul buys Java Notes)
INSERT INTO orders (order_number, user_id, subtotal, discount, coupon_code, coupon_discount, total, status)
 VALUES ('ORD-2026-100001', 2, 499, 300, NULL, 0, 199, 'PAID');
INSERT INTO order_items (order_id, product_id, title, price) VALUES (1, 1, 'Complete Java Notes', 199);
INSERT INTO payments (order_id, user_id, provider, razorpay_payment_id, amount, status, method)
 VALUES (1, 2, 'TEST', 'test_seed_payment_01', 199, 'CAPTURED', 'test-card');
INSERT INTO access_grants (user_id, product_id, order_id, status) VALUES (2, 1, 1, 'ACTIVE');
INSERT INTO notifications (user_id, title, message, type) VALUES
 (2, 'Welcome to DigiMart! 👋', 'Your account is ready. Browse the marketplace and start learning.', 'ACCOUNT'),
 (2, 'Payment successful 🎉', 'Your order ORD-2026-100001 is confirmed. Complete Java Notes is now in My Library.', 'PURCHASE');

-- Audit trail examples
INSERT INTO audit_logs (actor_id, actor_email, action, target_type, target_id, detail) VALUES
 (1, 'admin@digimart.test', 'product.created', 'product', '1', 'Complete Java Notes'),
 (1, 'admin@digimart.test', 'product.status.published', 'product', '1', NULL),
 (1, 'admin@digimart.test', 'coupon.created', 'coupon', '1', 'WELCOME20');

END $$;
