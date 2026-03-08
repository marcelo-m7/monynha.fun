"use client";

import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import ScrollToTop from "./components/ScrollToTop";

// Fallback component for Suspense
const PageLoader = () => (
  <div className="container py-8 space-y-6">
    <Skeleton className="h-10 w-48" />
    <Skeleton className="h-96 w-full rounded-2xl" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  </div>
);

// Lazy Loaded Pages
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Submit = lazy(() => import("./pages/Submit"));
const VideoDetails = lazy(() => import("./pages/VideoDetails"));
const Videos = lazy(() => import("./pages/Videos"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Community = lazy(() => import("./pages/Community"));
const About = lazy(() => import("./pages/About"));
const Rules = lazy(() => import("./pages/Rules"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Playlists = lazy(() => import("./pages/Playlists"));
const PlaylistDetails = lazy(() => import("./pages/PlaylistDetails"));
const CreateEditPlaylist = lazy(() => import("./pages/CreateEditPlaylist"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const App = () => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <ScrollToTop />
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/verify-email" element={<VerifyEmail />} />
        <Route path="/submit" element={<Submit />} />
        <Route path="/videos/:videoId" element={<VideoDetails />} />
        <Route path="/videos" element={<Videos />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/community" element={<Community />} />
        <Route path="/about" element={<About />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/playlists" element={<Playlists />} />
        <Route path="/playlists/new" element={<CreateEditPlaylist />} />
        <Route path="/playlists/:playlistId" element={<PlaylistDetails />} />
        <Route path="/playlists/:playlistId/edit" element={<CreateEditPlaylist />} />
        <Route path="/profile/:username" element={<Profile />} />
        <Route path="/profile/edit" element={<EditProfile />} />
        <Route path="/account/settings" element={<AccountSettings />} />
        <Route path="/:username" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default App;