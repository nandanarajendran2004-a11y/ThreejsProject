import { useNavigate} from "react-router-dom";
import Navbar from "../components/Navbar";
import "../components/Navbar.css";
import "./Home.css"
// import "../styles/main.css";

export default function Home(){
    const navigate = useNavigate();
    return(
    <>
    <Navbar/>
    <div className="hero">
        <div className="hero-content">
            <h1>Ship Hold Water Filling Simulation</h1>
            <p>Visualize and control the filling of water inside multiple cargo holds of a ship using an interactive 3D model.</p>

            <div className="features">
                <div className="feature-card">
                    <h3>5 Cargo Holds</h3>
                    <p>Interactive visualization of all ship compartments</p>
                </div>
                <div className="feature-card">
                    <h3>Fill control</h3>
                    <p>Start filling water into selected holds</p>
                </div>
                <div className="feature-card">
                    <h3>Real-Time view</h3>
                    <p>Monitor water level in 3D environment</p>
                </div>
            </div>
            <button className="start-btn" onClick={()=>navigate("/simulation")}>Launch Simulation</button>
        </div>
    </div>
    </>
    );
}