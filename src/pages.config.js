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
import Brain from './pages/Brain';
import Dashboard from './pages/Dashboard';
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
    "Brain": Brain,
    "Dashboard": Dashboard,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};