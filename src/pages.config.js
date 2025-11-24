import Home from './pages/Home';
import Projects from './pages/Projects';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Projects": Projects,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};