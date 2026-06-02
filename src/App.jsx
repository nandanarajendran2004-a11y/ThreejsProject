// import GltfViewer from "./pages/hold";
// function App(){
//   return <GltfViewer/>;
// }
// export default App;
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Gltfviewer from "./pages/Gltfviewer";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/simulation" element={<Gltfviewer />} />
    </Routes>
  );
}

export default App;