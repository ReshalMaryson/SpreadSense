import { Routes, Route } from "react-router-dom";

//components
import LandingPage from "./components/landingPage/landingPage";
import Login from "./components/auth/Login";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />

        {/* <Route element={<RequireAuth />}>
    <Route path="/generate" element={<Generate />} />
    <Route path="/profile" element={<Profile />} />
  </Route> */}
      </Routes>
    </>
  );
}

export default App;
