import Home from './pages/Home';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import BranchDetails from './pages/BranchDetails';
import Reports from './pages/Reports';
import Team from './pages/Team';
import Settings from './pages/Settings';
import ClientDetails from './pages/ClientDetails';
import MyTasks from './pages/MyTasks';
import Notifications from './pages/Notifications';
import Dashboard from './pages/Dashboard';
import AboutUs from './pages/AboutUs';
import ProjectsView from './pages/ProjectsView';
import KnowledgeBaseView from './pages/KnowledgeBaseView';
import JarvisView from './pages/JarvisView';
import CalendarView from './pages/CalendarView';
import SelfStudyView from './pages/SelfStudyView';
import ChatView from './pages/ChatView';
import DiaryView from './pages/DiaryView';
import CharacterCounterView from './pages/CharacterCounterView';
import MindMapView from './pages/MindMapView';
import AnalyticsView from './pages/AnalyticsView';
import TodoView from './pages/TodoView';
import Leaderboard from './pages/Leaderboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Projects": Projects,
    "ProjectDetails": ProjectDetails,
    "BranchDetails": BranchDetails,
    "Reports": Reports,
    "Team": Team,
    "Settings": Settings,
    "ClientDetails": ClientDetails,
    "MyTasks": MyTasks,
    "Notifications": Notifications,
    "Dashboard": Dashboard,
    "AboutUs": AboutUs,
    "ProjectsView": ProjectsView,
    "KnowledgeBaseView": KnowledgeBaseView,
    "JarvisView": JarvisView,
    "CalendarView": CalendarView,
    "SelfStudyView": SelfStudyView,
    "ChatView": ChatView,
    "DiaryView": DiaryView,
    "CharacterCounterView": CharacterCounterView,
    "MindMapView": MindMapView,
    "AnalyticsView": AnalyticsView,
    "TodoView": TodoView,
    "Leaderboard": Leaderboard,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};