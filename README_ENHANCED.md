# Monynha Fun - Video Curation Platform

![Monynha Fun Hero](./monynha-fun-hero.png)

A cultural video curation platform by **Monynha Softwares**, dedicated to preserving and discovering valuable YouTube content that traditional algorithms often overlook.

**🌐 Live Platform**: https://monynha.com/fun

---

## 🎯 Mission & Vision

We're committed to:
- **Democratizing Technology**: Making quality cultural content accessible to everyone
- **Human-Centered Curation**: Valuing human expertise assisted by AI, not replaced by it
- **Algorithmic Resistance**: Fighting against predatory algorithmic logic that prioritizes engagement over value
- **Cultural Preservation**: Protecting and promoting overlooked yet valuable content

---

## 📸 Platform Overview

### Homepage
![Homepage Screenshot](./monynha-homepage.png)

The landing page features:
- Hero section with call-to-action
- Curated video categories
- Featured and recent video collections
- Easy navigation to discover content

### Video Discovery
![Video Discovery](./monynha-videos.png)

Browse through:
- Multiple content categories
- Searchable video library
- Video details and metadata
- Contributor information

### Community & Playlists
![Playlists](./monynha-playlists.png)

- Create and manage custom playlists
- Share curated collections with the community
- View other contributors' playlists
- Add videos to favorites

### User Profiles
![User Profile](./monynha-profile.png)

- Public contributor profiles
- Personal profile customization
- Display name and bio
- Track contributed videos

---

## 🛠 Tech Stack

### Frontend
- **React.js** - UI library with TypeScript
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality component library
- **React Router DOM** - Client-side routing

### State Management & Data
- **TanStack Query** - Server state management, caching, and synchronization
- **React Hook Form** - Efficient form handling
- **Zod** - TypeScript-first schema validation

### Backend Services
- **Supabase** - PostgreSQL database, authentication, and Edge Functions
- **Supabase Auth** - Secure user authentication
- **Supabase RLS** - Row-level security policies

### UI & UX
- **Lucide React** - Clean, consistent icon library
- **Sonner** - Toast notifications
- **date-fns** - Date manipulation and formatting
- **i18next** - Internationalization support

---

## 📋 Key Features

### 1. **Video Discovery**
- Browse videos by category
- Search functionality
- View detailed video metadata
- Access YouTube video information
- Track video enrichment with AI metadata

### 2. **Playlist Management**
- Create custom playlists
- Add/remove videos from playlists
- Share playlists with community
- View and manage your playlists
- Browse other contributors' playlists

### 3. **User System**
- Secure authentication with Supabase
- User profiles with customizable display names and bios
- Public profile viewing
- Edit profile information
- Track user contributions

### 4. **Favorites**
- Mark videos as favorites
- Quick access to favorite videos
- Persistent favorites storage

### 5. **Community**
- View all community contributors
- Access contributor profiles
- See contribution statistics
- View popular categories

### 6. **Content Management**
- Submit new videos for curation
- AI-enriched metadata for videos
- Category organization
- Video details and descriptions

### 7. **Internationalization**
- Multi-language support
- Language switching
- i18next integration

---

## 🚀 Quick Start

### Prerequisites
- Node.js (recommended via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm or pnpm
- Git

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd monynha-fun

# Install dependencies
npm i
# or
pnpm install

# Start development server
npm run dev
# or
pnpm dev
```

The app will be available at `http://localhost:5173`

---

## 📁 Project Structure

```
src/
├── components/           # Reusable React components
│   ├── ui/              # shadcn/ui components
│   ├── Header.tsx       # Navigation header
│   ├── Footer.tsx       # Footer component
│   ├── HeroSection.tsx  # Landing hero
│   ├── VideoCard.tsx    # Video display card
│   ├── CategoryCard.tsx # Category display
│   └── ...
├── pages/               # Page components
│   ├── Index.tsx        # Homepage
│   ├── Auth.tsx         # Authentication
│   ├── Videos.tsx       # Video browse page
│   ├── VideoDetails.tsx # Video detail view
│   ├── Playlists.tsx    # Playlist management
│   ├── Profile.tsx      # Public profile
│   ├── EditProfile.tsx  # Profile editing
│   ├── Favorites.tsx    # Favorites page
│   ├── Community.tsx    # Community page
│   ├── Submit.tsx       # Video submission
│   ├── About.tsx        # About page
│   ├── FAQ.tsx          # FAQ page
│   ├── Rules.tsx        # Platform rules
│   ├── Contact.tsx      # Contact page
│   └── NotFound.tsx     # 404 page
├── hooks/               # Custom React hooks
│   ├── useAuth.tsx      # Authentication hook
│   ├── useVideos.ts     # Video data fetching
│   ├── usePlaylists.ts  # Playlist management
│   ├── useProfile.ts    # Profile data
│   ├── useFavorites.ts  # Favorites management
│   └── ...
├── integrations/        # External service integration
│   └── supabase/        # Supabase client setup
├── lib/                 # Utility functions
│   ├── utils.ts         # Common utilities (cn helper)
│   └── youtube.ts       # YouTube API helpers
├── i18n/                # Internationalization
│   ├── config.ts        # i18next configuration
│   └── locales/         # Translation files
├── App.tsx              # Main app component & routing
└── main.tsx             # Entry point
```

---

## 🔧 Available Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Build with development settings
npm run build:dev

# Preview production build
npm run preview

# Run linter (ESLint)
npm run lint
```

---

## 🐳 Docker Deployment

### Build Docker Image
```bash
docker build -t monynha-fun .
```

### Run Container
```bash
docker run -p 80:80 monynha-fun
```

The application uses Nginx for serving and is configured via `docker/nginx/nginx.conf`.

### Deployment Platforms
- **Coolify** - Recommended
- Any Docker-compatible hosting platform
- Ensure Supabase environment variables are properly configured

---

## 🔐 Environment Configuration

### Required Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

These variables enable:
- User authentication
- Database operations
- Edge Functions
- Real-time subscriptions

---

## 🗄 Database Architecture

### Key Tables
- **profiles** - User information (display_name, bio, etc.)
- **videos** - Video metadata and enrichment
- **categories** - Content categories
- **playlists** - User-created playlists
- **playlist_videos** - Videos in playlists (junction table)
- **ai_enrichments** - AI-generated video metadata

### Security
- Row-level security (RLS) policies on all tables
- User authentication via Supabase Auth
- Data isolation per user

---

## 🎨 Styling & Components

### Tailwind CSS
- Utility-first CSS framework
- Responsive design helpers
- Custom theme configuration in `tailwind.config.ts`

### shadcn/ui Components
The project leverages shadcn/ui for:
- Buttons, forms, and inputs
- Dialogs and modals
- Dropdowns and navigation
- Carousels and accordions
- And 30+ more components

### Custom Components
Additional components built following shadcn/ui patterns when needed.

---

## 🌍 Internationalization (i18n)

- Supports multiple languages
- Language switching available in header
- Translation files organized in `src/i18n/locales/`
- i18next integration for seamless translations

**Current Supported Languages**: Portuguese (PT-BR), English (EN)

---

## 🤝 Contributing

### How to Edit This Code

#### Option 1: Local Development
```bash
git clone <YOUR_GIT_URL>
cd monynha-fun
npm i
npm run dev
```

#### Option 2: GitHub Editor
1. Navigate to the desired file
2. Click the "Edit" button (pencil icon)
3. Make changes and commit

#### Option 3: GitHub Codespaces
1. Go to repository main page
2. Click "Code" → "Codespaces" → "New codespace"
3. Edit and push changes directly

---

## 🔗 Custom Domain Setup

To connect a custom domain:
1. Use your deployment platform's domain configuration
2. Follow platform-specific documentation
3. Update DNS records as needed

Example: `monynha.com/fun` is configured through the deployment platform.

---

## 📞 Support & Resources

- **About Page**: Learn more about Monynha Fun
- **FAQ Page**: Common questions and answers
- **Contact Page**: Get in touch with the team
- **Rules Page**: Community guidelines and policies

---

## 📊 Statistics

The platform tracks:
- Total video count
- Contributor statistics
- Video view counts and engagement
- Category popularity

---

## 🚨 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Use different port
npm run dev -- --port 3000
```

**Missing dependencies:**
```bash
# Clear lock file and reinstall
rm pnpm-lock.yaml
pnpm install
```

**Build errors:**
```bash
# Clear build cache
rm -rf dist
npm run build
```

---

## 📝 License & Credits

**Monynha Softwares** - Democratizing technology through human-centered AI

---

## 🔄 Version History

- **v0.0.0** - Initial release
- Continuous improvements and feature additions

---

## 📞 Get Involved

- **Submit Videos**: Share culturally valuable content
- **Create Playlists**: Curate themed collections
- **Contribute**: Help improve the platform
- **Join Community**: Connect with other curators

**Visit**: https://monynha.com/fun
