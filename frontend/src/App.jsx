import { Routes, Route } from "react-router-dom";

//components
import Header from "./components/header/header";
import LandingPage from "./components/landingPage/landingPage";
import Login from "./components/auth/login";
import Signup from "./components/auth/signup";
function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* <Route element={<RequireAuth />}>
    <Route path="/generate" element={<Generate />} />
    <Route path="/profile" element={<Profile />} />
  </Route> */}
      </Routes>
    </>
  );
}

export default App;
