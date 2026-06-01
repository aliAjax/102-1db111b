import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Home } from "@/pages/Home";
import { PlantDetail } from "@/pages/PlantDetail";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/plant/:id" element={<PlantDetail />} />
      </Routes>
    </Router>
  );
}
