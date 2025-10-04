# SpreadLov - Real-Time Social Connection Platform

## Overview

SpreadLov is a modern, full-stack real-time social connection platform built with React, Node.js/Express, and WebSocket technology. The application enables users to communicate with each other through instant messaging, with features including user authentication, profile management, online status tracking, image sharing, and persistent message storage. The architecture follows a monorepo structure with separate client and server directories, utilizing modern web technologies for a responsive and secure chat experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**October 3, 2025** - Filter Modal Redesign for Discovery Page
- Converted filter sidebar to a modern centered popup modal using Dialog component
- Modal opens when filter icon is clicked, centered on screen with overlay backdrop
- Smooth fade-in/fade-out animations when opening and closing the modal
- Dismissible via close button (X) or clicking outside the modal area
- Fully responsive design: adapts perfectly to all screen sizes (mobile, tablet, desktop)
- Maximum height of 90vh to prevent overflow on smaller screens
- Scrollable content area for all filter options with max-height constraint
- Enhanced spacing and padding for better touch-friendly mobile experience
- Modern card-based filter sections with gradient backgrounds and shadows
- Age Range filter with dual slider (18-80 years) and live value display
- Gender Preference filter with radio buttons (All Genders, Male, Female, Other)
- Location filter with searchable country dropdown using Command component
- Apply Filters and Reset All buttons at the bottom with distinct styling
- Background dimmed when modal is open to focus attention on filters
- Maintains all existing filter persistence functionality (auto-save, individual removal, reset)

**October 3, 2025** - Filter Persistence for Discovery Page
- Added database columns to store user filter preferences (filter_gender, filter_location, filter_age_min, filter_age_max)
- Created API endpoints for filter operations:
  - GET /api/user/filters - Fetch saved filter preferences
  - PATCH /api/user/filters - Save/update filter preferences
  - DELETE /api/user/filters - Reset filters to default values
- Implemented automatic filter loading on user login/page load
- Filters are saved to database when "Apply Filters" is clicked
- Individual filter removal updates the database automatically
- Reset button clears filters in both state and database
- Default behavior: empty filters for first-time users

**October 3, 2025** - Discover Page Filter Sidebar Implementation
- Added responsive filter sidebar that slides in from the left with smooth animations
- Implemented searchable country dropdown using Command component for location filtering
- Added Age Range filter with dual sliders featuring automatic validation (prevents min > max)
- Included Gender filter with radio button options (All, Male, Female)
- Added Apply Filters and Reset All buttons with proper state management
- Implemented active filter chips/badges showing applied filters with remove capability
- Separated temporary filter state (for editing) from applied filters (active on data)
- Responsive design: 80% width on mobile, fixed 24rem width on desktop
- Created 20 diverse test user profiles with dog images, varying ages, genders, and countries
- Filter sidebar includes overlay backdrop for mobile dismissal
- All filters work together to narrow down user discovery results

**October 3, 2025** - Authentication Page Complete Redesign
- Completely modernized login/signup page with modern UI/UX
- Split-screen layout: auth forms on left, hero section on right (desktop)
- Added icon inputs for all form fields (User, Lock, Mail, Calendar, MapPin icons)
- Implemented modern rounded design (rounded-xl, rounded-2xl, rounded-3xl)
- Enhanced with gradient backgrounds and shadow effects
- Added "Forgot password?" link with hover effects
- Smooth tab transitions between Sign In and Sign Up
- Animated loading states with spinners for form submissions
- Responsive date picker with Month/Day/Year dropdowns
- Enhanced hero section with animated feature cards (Lightning Fast, Stay Connected)
- Cards have hover scale effects and smooth transitions
- Fully responsive: mobile stacks vertically, desktop side-by-side layout
- Consistent color scheme and typography throughout
- All inputs have focus states with border and ring animations

**October 3, 2025** - User Profile View Page Redesign
- Completely refactored user profile view page (where users view other users' profiles)
- Implemented modern, responsive design matching Instagram/Twitter aesthetic
- Added responsive photo gallery with hover zoom effects (4 columns desktop, 3 tablet, 2 mobile)
- Enhanced profile section with animated online status indicator
- Redesigned About section with colorful icon cards for age, gender, location, member since
- Added fullscreen photo viewer with swipe indicators
- Implemented smooth transitions and hover animations throughout
- Applied gradient cards, rounded corners, and modern shadow effects
- Ensured mobile-first responsive design with sticky navigation
- Matched design consistency with edit profile page styling

**October 3, 2025** - Initial Replit Environment Setup
- Installed all npm dependencies
- Configured PostgreSQL database with Replit's built-in database service
- Pushed database schema using Drizzle ORM (users, conversations, messages, notifications tables)
- Set up development workflow running on port 5000
- Configured Vite to allow all hosts for Replit proxy support
- Created .gitignore for Node.js project
- Configured deployment settings for production (autoscale deployment with build and start scripts)

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and functional components using hooks
- **UI Framework**: shadcn/ui components with Radix UI primitives for accessibility
- **Styling**: Tailwind CSS for utility-first responsive design with custom CSS variables for theming
- **State Management**: React Context API for authentication and global state, with TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing with protected route implementation
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Authentication**: Passport.js with local strategy using session-based authentication
- **Session Management**: Express sessions with memory store (configurable for production databases)
- **Password Security**: Native crypto module with scrypt hashing and random salt generation
- **File Uploads**: Multer middleware for handling image uploads with file type validation and size limits
- **Real-time Communication**: WebSocket implementation using 'ws' library for instant messaging and online status updates

### Database Design
- **ORM**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **Schema Structure**:
  - Users table: Authentication credentials, profile information, online status
  - Conversations table: One-to-one chat relationships between users
  - Messages table: Chat messages with support for text content and image URLs
- **Database Provider**: Configured for Neon Database (PostgreSQL-compatible serverless database)
- **Migration System**: Drizzle Kit for database schema migrations and management

### Real-time Features
- **WebSocket Server**: Custom WebSocket implementation integrated with HTTP server
- **Message Broadcasting**: Real-time message delivery between authenticated users with instant cache updates
- **Online Status Tracking**: Live user presence indicators with automatic status updates
- **Typing Indicators**: Real-time typing status notifications during active conversations
- **Optimized Message Updates**: Uses TanStack Query setQueryData for immediate message display without network delays

### Security Implementation
- **Authentication Flow**: Session-based authentication with HTTP-only cookies
- **Password Storage**: Cryptographically secure password hashing with individual salts
- **Route Protection**: Server-side authentication middleware protecting all API endpoints
- **File Upload Security**: MIME type validation and file size restrictions for image uploads
- **WebSocket Security**: Authentication required for WebSocket connections with user ID verification

## External Dependencies

### Database Services
- **Neon Database**: PostgreSQL-compatible serverless database for production data storage
- **Database Connection**: @neondatabase/serverless driver for optimized serverless database connections

### UI Component Libraries
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives including dialogs, dropdowns, forms, and navigation components
- **Lucide React**: Modern icon library providing consistent iconography throughout the application

### Development and Build Tools
- **Vite**: Fast build tool with Hot Module Replacement for development
- **TypeScript**: Static typing for enhanced developer experience and code reliability
- **Tailwind CSS**: Utility-first CSS framework with PostCSS processing
- **ESBuild**: Fast JavaScript bundler for production server builds

### Authentication and Session Management
- **Passport.js**: Flexible authentication middleware with local strategy implementation
- **Express Session**: Session middleware with configurable store backends
- **Connect-pg-simple**: PostgreSQL session store adapter for production environments

### File Processing
- **Multer**: Multipart form data handling for file uploads
- **Image Processing**: File type validation and storage management for user profile photos and message images

### Real-time Communication
- **WebSocket (ws)**: Low-level WebSocket implementation for real-time bidirectional communication
- **Custom Socket Management**: Application-specific socket handling for chat features and user presence