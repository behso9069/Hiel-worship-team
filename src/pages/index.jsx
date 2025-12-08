import Layout from "./Layout.jsx";

import Home from "./Home";

import Members from "./Members";

import Announcements from "./Announcements";

import Songs from "./Songs";

import Schedule from "./Schedule";

import Calendar from "./Calendar";

import Prayer from "./Prayer";

import Archive from "./Archive";

import Meetings from "./Meetings";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Home: Home,
    
    Members: Members,
    
    Announcements: Announcements,
    
    Songs: Songs,
    
    Schedule: Schedule,
    
    Calendar: Calendar,
    
    Prayer: Prayer,
    
    Archive: Archive,
    
    Meetings: Meetings,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Home />} />
                
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/Members" element={<Members />} />
                
                <Route path="/Announcements" element={<Announcements />} />
                
                <Route path="/Songs" element={<Songs />} />
                
                <Route path="/Schedule" element={<Schedule />} />
                
                <Route path="/Calendar" element={<Calendar />} />
                
                <Route path="/Prayer" element={<Prayer />} />
                
                <Route path="/Archive" element={<Archive />} />
                
                <Route path="/Meetings" element={<Meetings />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}