import {Link} from "react-router-dom";
export default function Navbar(){
    return(
        <nav className = "navbar">
            <div className = "logo">Ship Water Fill Simulator</div>
            <div className = "nav-links">
                <Link to="/">Home</Link>
                <Link to="/simulation">Simulation</Link>
            </div>
        </nav>
    );
}