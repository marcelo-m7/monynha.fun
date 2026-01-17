import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Submit from "./pages/Submit";
import VideoDetails from "./pages/VideoDetails";
import Videos from "./pages/Videos";
import Favorites from "./pages/Favorites";
import Community from "./pages/Community";
import About from "./pages/About";
import Rules from "./pages/Rules";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import Playlists from "./pages/Playlists";
import PlaylistDetails from "./pages/PlaylistDetails";
import CreateEditPlaylist from "./pages/CreateEditPlaylist";
import Profile from "./pages/Profile"; // Import new Profile page
import EditProfile from "./pages/EditProfile"; // Import new EditProfile page
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";

const App = () => (
  <BrowserRouter>
    <ScrollToTop />
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
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
      <Route path="/profile/:username" element={<Profile />} /> {/* New public profile route */}
      <Route path="/profile/edit" element={<EditProfile />} /> {/* New edit profile route */}
      <Route path="/:username" element={<Profile />} /> {/* Public user profile page (e.g., /marcelo) */}
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;
