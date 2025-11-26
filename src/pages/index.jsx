import { lazy, Suspense } from 'react';
import Layout from "./Layout.jsx";
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

// Lazy load all pages for better performance
const Home = lazy(() => import("./Home"));
const Projects = lazy(() => import("./Projects"));
const ProjectDetails = lazy(() => import("./ProjectDetails"));
const BranchDetails = lazy(() => import("./BranchDetails"));
const Reports = lazy(() => import("./Reports"));
const Team = lazy(() => import("./Team"));
const Settings = lazy(() => import("./Settings"));
const ClientDetails = lazy(() => import("./ClientDetails"));
const MyTasks = lazy(() => import("./MyTasks"));
const Notifications = lazy(() => import("./Notifications"));
const Dashboard = lazy(() => import("./Dashboard"));
const AboutUs = lazy(() => import("./AboutUs"));
const ProjectsView = lazy(() => import("./ProjectsView"));
const KnowledgeBaseView = lazy(() => import("./KnowledgeBaseView"));
const JarvisView = lazy(() => import("./JarvisView"));
const CalendarView = lazy(() => import("./CalendarView"));
const SelfStudyView = lazy(() => import("./SelfStudyView"));
const ChatView = lazy(() => import("./ChatView"));
const DiaryView = lazy(() => import("./DiaryView"));
const CharacterCounterView = lazy(() => import("./CharacterCounterView"));
const MindMapView = lazy(() => import("./MindMapView"));
const AnalyticsView = lazy(() => import("./AnalyticsView"));
const TodoView = lazy(() => import("./TodoView"));
const Leaderboard = lazy(() => import("./Leaderboard"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
  </div>
);

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
            <Suspense fallback={<PageLoader />}>
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
            </Suspense>
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