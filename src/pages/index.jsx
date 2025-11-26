import Layout from "./Layout.jsx";

import Home from "./Home";

import Projects from "./Projects";

import ProjectDetails from "./ProjectDetails";

import BranchDetails from "./BranchDetails";

import Reports from "./Reports";

import Team from "./Team";

import Settings from "./Settings";

import ClientDetails from "./ClientDetails";

import MyTasks from "./MyTasks";

import Notifications from "./Notifications";

import Dashboard from "./Dashboard";

import AboutUs from "./AboutUs";

import ProjectsView from "./ProjectsView";

import KnowledgeBaseView from "./KnowledgeBaseView";

import JarvisView from "./JarvisView";

import CalendarView from "./CalendarView";

import SelfStudyView from "./SelfStudyView";

import ChatView from "./ChatView";

import DiaryView from "./DiaryView";

import CharacterCounterView from "./CharacterCounterView";

import MindMapView from "./MindMapView";

import AnalyticsView from "./AnalyticsView";

import TodoView from "./TodoView";

import Leaderboard from "./Leaderboard";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Home: Home,
    
    Projects: Projects,
    
    ProjectDetails: ProjectDetails,
    
    BranchDetails: BranchDetails,
    
    Reports: Reports,
    
    Team: Team,
    
    Settings: Settings,
    
    ClientDetails: ClientDetails,
    
    MyTasks: MyTasks,
    
    Notifications: Notifications,
    
    Dashboard: Dashboard,
    
    AboutUs: AboutUs,
    
    ProjectsView: ProjectsView,
    
    KnowledgeBaseView: KnowledgeBaseView,
    
    JarvisView: JarvisView,
    
    CalendarView: CalendarView,
    
    SelfStudyView: SelfStudyView,
    
    ChatView: ChatView,
    
    DiaryView: DiaryView,
    
    CharacterCounterView: CharacterCounterView,
    
    MindMapView: MindMapView,
    
    AnalyticsView: AnalyticsView,
    
    TodoView: TodoView,
    
    Leaderboard: Leaderboard,
    
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
                
                <Route path="/Projects" element={<Projects />} />
                
                <Route path="/ProjectDetails" element={<ProjectDetails />} />
                
                <Route path="/BranchDetails" element={<BranchDetails />} />
                
                <Route path="/Reports" element={<Reports />} />
                
                <Route path="/Team" element={<Team />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/ClientDetails" element={<ClientDetails />} />
                
                <Route path="/MyTasks" element={<MyTasks />} />
                
                <Route path="/Notifications" element={<Notifications />} />
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/AboutUs" element={<AboutUs />} />
                
                <Route path="/ProjectsView" element={<ProjectsView />} />
                
                <Route path="/KnowledgeBaseView" element={<KnowledgeBaseView />} />
                
                <Route path="/JarvisView" element={<JarvisView />} />
                
                <Route path="/CalendarView" element={<CalendarView />} />
                
                <Route path="/SelfStudyView" element={<SelfStudyView />} />
                
                <Route path="/ChatView" element={<ChatView />} />
                
                <Route path="/DiaryView" element={<DiaryView />} />
                
                <Route path="/CharacterCounterView" element={<CharacterCounterView />} />
                
                <Route path="/MindMapView" element={<MindMapView />} />
                
                <Route path="/AnalyticsView" element={<AnalyticsView />} />
                
                <Route path="/TodoView" element={<TodoView />} />
                
                <Route path="/Leaderboard" element={<Leaderboard />} />
                
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