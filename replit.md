# Deepak Items

## Overview

A mobile-first listing management application where users can sign up and create their own marketplace listings. Users track buyer interest, manage queues, and coordinate pickup times. Buyers can self-register via QR code sharing. The app features role-based access with protected user dashboards and admin management capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## Authentication & Authorization

**Authentication Provider**: Replit Auth (OpenID Connect)
- Supports Google, GitHub, Apple, and Email/Password login
- Session-based authentication with PostgreSQL session storage
- Automatic token refresh for expired sessions
- 7-day session TTL with secure HTTP-only cookies

**User Roles**:
- **User** (default): Can create and manage their own listings
- **Admin**: Full access to manage all listings and promote/demote other admins

**Authorization Flow**:
1. Unauthenticated users see Landing page with signup/login
2. Authenticated users access protected Home page to create/manage own listings
3. Admin users can access Admin panel to manage all users and listings

**Protected Routes**:
- `/` - Home (user dashboard) - requires authentication
- `/admin` - Admin panel - requires admin role
- `/join/:productId` - Public buyer registration - no authentication required

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management with optimistic updates
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens following Material Design principles
- **Forms**: React Hook Form with Zod validation for type-safe form handling

**Design System**:
- Mobile-first responsive design with Material Design patterns
- Custom color system using CSS variables for theme support (light/dark modes)
- Typography using Inter font family from Google Fonts
- Consistent spacing using Tailwind's spacing scale (2, 4, 6, 8)
- Elevation system for interactive states (hover, active)

**Key Components**:
- `ProductCard`: Main listing display with expandable buyer queue, share QR code button
- `ShareProductDialog`: QR code generation and shareable link for buyer self-registration
- `BuyerQueueItem`: Individual buyer in queue with status indicators
- `AddProductDialog`: Form for creating new listings with image upload
- `AddBuyerDialog`: Form for adding interested buyers to a product (manual entry)
- `JoinProduct`: Public-facing buyer self-registration page
- `ObjectUploader`: Custom file upload component for product images

### Backend Architecture

**Server Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ESM modules
- **Build Tool**: Vite for frontend bundling, esbuild for server bundling
- **Development**: Hot module replacement via Vite middleware in dev mode

**Data Layer**:
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Storage Strategy**: Dual storage implementation with interface (`IStorage`)
  - `MemStorage`: In-memory storage for development/testing
  - Database storage ready via Drizzle (PostgreSQL via Neon serverless driver)
- **Schema**: Two main entities - Products and BuyerInterests with cascade delete relationship

**Data Models**:
- **Users**: ID (from Replit Auth), email, first name, last name, profile image URL, role (user/admin), timestamps
- **Sessions**: Session ID, session data (JSONB), expiration timestamp (required for Replit Auth)
- **Products**: ID, user ID (owner), title, description, price (in cents), image URL, status (active/sold/removed), timestamps
- **BuyerInterests**: Linked to products, buyer name, phone (E.164 format), email (nullable), SMS opt-in flag, pickup time, offer price (nullable for free items), status (active/missed/completed), queue position, timestamps

**Business Logic**:
- Automatic missed status updates via polling (30-second intervals)
- Queue position management for buyer interests
- Price handling in cents to avoid floating-point issues
- Cascade deletion when products are removed
- Duplicate prevention: blocks buyers with existing phone or email in active queue
- Rate limiting: 5 registration requests per 15 minutes per IP address

### API Design

**Authentication Endpoints**:
- `GET /api/login` - Initiates Replit Auth login flow
- `GET /api/callback` - OAuth callback handler
- `GET /api/logout` - Ends session and redirects to Replit logout
- `GET /api/auth/user` - Get current authenticated user (protected)

**User Endpoints** (protected - requires authentication):
- `GET /api/products` - List current user's products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create new product for current user
- `PATCH /api/products/:id` - Update own product (or any if admin)

**Public Endpoints**:
- `GET /api/products/:id/public` - Public product details (id, title, description, price, imageUrl, queueLength)
- `POST /api/buying-queue` - Add buyer to product queue (rate limited: 5 per 15min per IP)

**Admin Endpoints** (protected - requires admin role):
- `GET /api/admin/products` - List all products from all users
- `DELETE /api/admin/products/:id` - Delete any product
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id/role` - Update user role (user/admin)

**Object Storage Endpoints**:
- `GET /objects/:objectPath(*)` - Download/stream object files
- `POST /api/objects/upload` - Get presigned upload URL
- `PUT /api/product-images` - Normalize and validate image paths

**Request/Response Format**:
- JSON for all API communication
- Validation using Zod schemas shared between client and server
- Standard HTTP status codes with descriptive error messages
  - 409 Conflict: Duplicate phone/email in active queue
  - 410 Gone: Product no longer available (not active)
  - 429 Too Many Requests: Rate limit exceeded

### External Dependencies

**Cloud Services**:
- **Google Cloud Storage**: Product image storage via `@google-cloud/storage`
  - Configured for Replit sidecar integration (port 1106)
  - External account authentication with access tokens
  - ACL policy management for object access control
  - Public/private object visibility controls

**Database**:
- **Neon Serverless PostgreSQL**: Primary database via `@neondatabase/serverless`
  - Configured via `DATABASE_URL` environment variable
  - Drizzle Kit for migrations and schema management
  - Connection pooling handled by Neon driver

**Development Tools**:
- **Replit Integrations**: 
  - Vite plugins for runtime error overlay, cartographer, and dev banner
  - Sidecar endpoint for credential management
  
**UI Component Libraries**:
- **Radix UI**: Headless accessible component primitives
- **Lucide React**: Icon library for consistent iconography
- **qrcode.react**: QR code generation for buyer registration links
- **date-fns**: Date formatting and manipulation
- **class-variance-authority**: Type-safe component variants
- **tailwind-merge & clsx**: Utility class management

**Form Management**:
- **React Hook Form**: Form state and validation
- **Zod**: Runtime schema validation with TypeScript type inference
- **@hookform/resolvers**: Zod resolver integration

**Image Upload**:
- Custom implementation using native file input
- Integration with Google Cloud Storage presigned URLs
- Image validation and normalization pipeline

**Security & Rate Limiting**:
- **express-rate-limit**: Rate limiting middleware on public endpoints
  - Buyer registration: 5 requests per 15 minutes per IP
- **Duplicate Detection**: Database-level checks for duplicate phone/email in active queues
- **Phone Validation**: E.164 format enforcement (/^\+[1-9]\d{1,14}$/)
- **Contact Requirement**: At least one contact method (phone or email) required

## Key Features

### Self-Service Buyer Registration
- **QR Code Sharing**: Sellers can share a QR code for each active listing
- **Public Join Page** (`/join/:productId`): Buyers scan QR code or use direct link to register themselves
- **Contact Information**: Buyers provide name, phone (E.164), email (optional), and SMS opt-in preference
- **Offer Submission**: Buyers can make offers or indicate interest in free items
- **Queue Visibility**: After registration, buyers see their position in the queue
- **Duplicate Prevention**: System blocks duplicate registrations using same phone or email

### Seller Dashboard Features
- **Share QR Code**: Generate and share QR codes for active listings
- **Copy Link**: Quick clipboard copy of join URL
- **Manual Entry**: Option to manually add buyers (legacy flow)
- **Queue Management**: View all interested buyers with contact details
- **Privacy Toggle**: Contact information visibility controls

### Recent Changes (November 2025)
- Added self-service buyer registration flow via QR code scanning
- Implemented duplicate prevention for phone and email in active queues
- Added rate limiting (5 requests per 15 minutes) on public registration endpoint
- Created ShareProductDialog component with QR code generation
- Enhanced buyer contact fields: phone (required E.164), email (optional), SMS opt-in
- Fixed React Hook Form integration with datetime-local input for better testing compatibility
# Deepak Items

## Overview

A mobile-first listing management application where users can sign up and create their own marketplace listings. Users track buyer interest, manage queues, and coordinate pickup times. Buyers can self-register via QR code sharing. The app features role-based access with protected user dashboards and admin management capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## Authentication & Authorization

**Authentication Provider**: Replit Auth (OpenID Connect)
- Supports Google, GitHub, Apple, and Email/Password login
- Session-based authentication with PostgreSQL session storage
- Automatic token refresh for expired sessions
- 7-day session TTL with secure HTTP-only cookies

**User Roles**:
- **User** (default): Can create and manage their own listings
- **Admin**: Full access to manage all listings and promote/demote other admins

**Authorization Flow**:
1. Unauthenticated users see Landing page with signup/login
2. Authenticated users access protected Home page to create/manage own listings
3. Admin users can access Admin panel to manage all users and listings

**Protected Routes**:
- `/` - Home (user dashboard) - requires authentication
- `/admin` - Admin panel - requires admin role
- `/join/:productId` - Public buyer registration - no authentication required

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management with optimistic updates
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens following Material Design principles
- **Forms**: React Hook Form with Zod validation for type-safe form handling

**Design System**:
- Mobile-first responsive design with Material Design patterns
- Custom color system using CSS variables for theme support (light/dark modes)
- Typography using Inter font family from Google Fonts
- Consistent spacing using Tailwind's spacing scale (2, 4, 6, 8)
- Elevation system for interactive states (hover, active)

**Key Components**:
- `ProductCard`: Main listing display with expandable buyer queue, share QR code button
- `ShareProductDialog`: QR code generation and shareable link for buyer self-registration
- `BuyerQueueItem`: Individual buyer in queue with status indicators
- `AddProductDialog`: Form for creating new listings with image upload
- `AddBuyerDialog`: Form for adding interested buyers to a product (manual entry)
- `JoinProduct`: Public-facing buyer self-registration page
- `ObjectUploader`: Custom file upload component for product images

### Backend Architecture

**Server Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ESM modules
- **Build Tool**: Vite for frontend bundling, esbuild for server bundling
- **Development**: Hot module replacement via Vite middleware in dev mode

**Data Layer**:
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Storage Strategy**: Dual storage implementation with interface (`IStorage`)
  - `MemStorage`: In-memory storage for development/testing
  - Database storage ready via Drizzle (PostgreSQL via Neon serverless driver)
- **Schema**: Two main entities - Products and BuyerInterests with cascade delete relationship

**Data Models**:
- **Users**: ID (from Replit Auth), email, first name, last name, profile image URL, role (user/admin), timestamps
- **Sessions**: Session ID, session data (JSONB), expiration timestamp (required for Replit Auth)
- **Products**: ID, user ID (owner), title, description, price (in cents), image URL, status (active/sold/removed), timestamps
- **BuyerInterests**: Linked to products, buyer name, phone (E.164 format), email (nullable), SMS opt-in flag, pickup time, offer price (nullable for free items), status (active/missed/completed), queue position, timestamps

**Business Logic**:
- Automatic missed status updates via polling (30-second intervals)
- Queue position management for buyer interests
- Price handling in cents to avoid floating-point issues
- Cascade deletion when products are removed
- Duplicate prevention: blocks buyers with existing phone or email in active queue
- Rate limiting: 5 registration requests per 15 minutes per IP address

### API Design

**Authentication Endpoints**:
- `GET /api/login` - Initiates Replit Auth login flow
- `GET /api/callback` - OAuth callback handler
- `GET /api/logout` - Ends session and redirects to Replit logout
- `GET /api/auth/user` - Get current authenticated user (protected)

**User Endpoints** (protected - requires authentication):
- `GET /api/products` - List current user's products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create new product for current user
- `PATCH /api/products/:id` - Update own product (or any if admin)

**Public Endpoints**:
- `GET /api/products/:id/public` - Public product details (id, title, description, price, imageUrl, queueLength)
- `POST /api/buying-queue` - Add buyer to product queue (rate limited: 5 per 15min per IP)

**Admin Endpoints** (protected - requires admin role):
- `GET /api/admin/products` - List all products from all users
- `DELETE /api/admin/products/:id` - Delete any product
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id/role` - Update user role (user/admin)

**Object Storage Endpoints**:
- `GET /objects/:objectPath(*)` - Download/stream object files
- `POST /api/objects/upload` - Get presigned upload URL
- `PUT /api/product-images` - Normalize and validate image paths

**Request/Response Format**:
- JSON for all API communication
- Validation using Zod schemas shared between client and server
- Standard HTTP status codes with descriptive error messages
  - 409 Conflict: Duplicate phone/email in active queue
  - 410 Gone: Product no longer available (not active)
  - 429 Too Many Requests: Rate limit exceeded

### External Dependencies

**Cloud Services**:
- **Google Cloud Storage**: Product image storage via `@google-cloud/storage`
  - Configured for Replit sidecar integration (port 1106)
  - External account authentication with access tokens
  - ACL policy management for object access control
  - Public/private object visibility controls

**Database**:
- **Neon Serverless PostgreSQL**: Primary database via `@neondatabase/serverless`
  - Configured via `DATABASE_URL` environment variable
  - Drizzle Kit for migrations and schema management
  - Connection pooling handled by Neon driver

**Development Tools**:
- **Replit Integrations**: 
  - Vite plugins for runtime error overlay, cartographer, and dev banner
  - Sidecar endpoint for credential management
  
**UI Component Libraries**:
- **Radix UI**: Headless accessible component primitives
- **Lucide React**: Icon library for consistent iconography
- **qrcode.react**: QR code generation for buyer registration links
- **date-fns**: Date formatting and manipulation
- **class-variance-authority**: Type-safe component variants
- **tailwind-merge & clsx**: Utility class management

**Form Management**:
- **React Hook Form**: Form state and validation
- **Zod**: Runtime schema validation with TypeScript type inference
- **@hookform/resolvers**: Zod resolver integration

**Image Upload**:
- Custom implementation using native file input
- Integration with Google Cloud Storage presigned URLs
- Image validation and normalization pipeline

**Security & Rate Limiting**:
- **express-rate-limit**: Rate limiting middleware on public endpoints
  - Buyer registration: 5 requests per 15 minutes per IP
- **Duplicate Detection**: Database-level checks for duplicate phone/email in active queues
- **Phone Validation**: E.164 format enforcement (/^\+[1-9]\d{1,14}$/)
- **Contact Requirement**: At least one contact method (phone or email) required

## Key Features

### Self-Service Buyer Registration
- **QR Code Sharing**: Sellers can share a QR code for each active listing
- **Public Join Page** (`/join/:productId`): Buyers scan QR code or use direct link to register themselves
- **Contact Information**: Buyers provide name, phone (E.164), email (optional), and SMS opt-in preference
- **Offer Submission**: Buyers can make offers or indicate interest in free items
- **Queue Visibility**: After registration, buyers see their position in the queue
- **Duplicate Prevention**: System blocks duplicate registrations using same phone or email

### Seller Dashboard Features
- **Share QR Code**: Generate and share QR codes for active listings
- **Copy Link**: Quick clipboard copy of join URL
- **Manual Entry**: Option to manually add buyers (legacy flow)
- **Queue Management**: View all interested buyers with contact details
- **Privacy Toggle**: Contact information visibility controls

### Recent Changes (November 2025)
- Added self-service buyer registration flow via QR code scanning
- Implemented duplicate prevention for phone and email in active queues
- Added rate limiting (5 requests per 15 minutes) on public registration endpoint
- Created ShareProductDialog component with QR code generation
- Enhanced buyer contact fields: phone (required E.164), email (optional), SMS opt-in
- Fixed React Hook Form integration with datetime-local input for better testing compatibility