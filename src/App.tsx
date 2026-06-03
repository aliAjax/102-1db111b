import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Home } from "@/pages/Home";
import { PlantDetail } from "@/pages/PlantDetail";
import { CareStats } from "@/pages/CareStats";
import { PlantCompare } from "@/pages/PlantCompare";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/plant/:id" element={<PlantDetail />} />
        <Route path="/care-stats" element={<CareStats />} />
        <Route path="/compare" element={<PlantCompare />} />
      </Routes>
    </Router>
  );
}
