import Home from './pages/Home';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Projects": Projects,
    "ProjectDetails": ProjectDetails,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};