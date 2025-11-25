import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown, Folder, MessageSquare, BookOpen, Clock, GraduationCap, Link2, Users, BarChart3, Target, Brain } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function Home() {
  const [activeDropdown, setActiveDropdown] = useState(null);

  const products = [
    {
      category: "Project Management",
      icon: <Folder className="w-5 h-5" />,
      items: ["Projects", "Tasks", "Dashboards", "Board View"]
    },
    {
      category: "Communication",
      icon: <MessageSquare className="w-5 h-5" />,
      items: ["Team Chat"]
    },
    {
      category: "Knowledge Base",
      icon: <BookOpen className="w-5 h-5" />,
      items: ["Document Storage", "AI-Powered Search"]
    },
    {
      category: "Time Management",
      icon: <Clock className="w-5 h-5" />,
      items: ["Calendar", "Scheduling", "Time Tracking", "Automations"]
    },
    {
      category: "Learning",
      icon: <GraduationCap className="w-5 h-5" />,
      items: ["Self-Study with AI", "Course Generation"]
    },
    {
      category: "Integrations",
      icon: <Link2 className="w-5 h-5" />,
      items: ["Google Calendar", "Third-party Tools"]
    }
  ];

  const solutions = [
    { name: "Project Management", icon: <Folder className="w-5 h-5" /> },
    { name: "Marketing Teams", icon: <Target className="w-5 h-5" /> },
    { name: "Time & Task Management", icon: <Clock className="w-5 h-5" /> },
    { name: "Self-Study & Education", icon: <GraduationCap className="w-5 h-5" /> },
    { name: "Team Collaboration", icon: <Users className="w-5 h-5" /> }
  ];

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(180deg, #87CEEB 0%, #FFDAB9 50%, #FFA07A 100%)'
    }}>
      {/* Navigation - Glassmorphism style matching the app */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="bg-black/30 backdrop-blur-2xl rounded-full px-8 py-3 flex items-center justify-between border border-white/20">
            {/* Logo */}
            <div className="text-2xl font-black tracking-tight text-white">
              LYNCK <span className="text-white/80">SPACE</span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              <Link to={createPageUrl('AboutUs')} className="px-4 py-2 text-white/80 hover:text-white font-medium transition-colors rounded-full hover:bg-white/10">
                About Us
              </Link>
              
              {/* Products Dropdown */}
              <div 
                className="relative"
                onMouseEnter={() => setActiveDropdown('products')}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button className="px-4 py-2 text-white/80 hover:text-white font-medium transition-colors flex items-center gap-1 rounded-full hover:bg-white/10">
                  Products <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'products' ? 'rotate-180' : ''}`} />
                </button>
                
                {activeDropdown === 'products' && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-[600px]">
                    <div className="bg-black/40 backdrop-blur-2xl rounded-2xl border border-white/20 p-6 grid grid-cols-2 gap-6">
                      {products.map((product, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center gap-2 text-white font-semibold text-sm">
                            {product.icon}
                            {product.category}
                          </div>
                          <ul className="space-y-1 pl-7">
                            {product.items.map((item, i) => (
                              <li key={i} className="text-white/60 text-sm hover:text-white cursor-pointer transition-colors">
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Solutions Dropdown */}
              <div 
                className="relative"
                onMouseEnter={() => setActiveDropdown('solutions')}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button className="px-4 py-2 text-white/80 hover:text-white font-medium transition-colors flex items-center gap-1 rounded-full hover:bg-white/10">
                  Solutions <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'solutions' ? 'rotate-180' : ''}`} />
                </button>
                
                {activeDropdown === 'solutions' && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-[280px]">
                    <div className="bg-black/40 backdrop-blur-2xl rounded-2xl border border-white/20 p-4 space-y-1">
                      {solutions.map((solution, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors group">
                          <span className="text-white/60 group-hover:text-white transition-colors">{solution.icon}</span>
                          <span className="text-white/80 group-hover:text-white font-medium text-sm transition-colors">{solution.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 rounded-full">
                  Sign In
                </Button>
              </Link>
              <Link to={createPageUrl('Dashboard')}>
                <Button className="bg-white/20 hover:bg-white/30 text-white rounded-full px-6 backdrop-blur-sm border border-white/20">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-white drop-shadow-xl mb-8">
            LYNCK <span className="text-white/90">SPACE</span>
          </h1>
          
          <p className="text-white/80 text-xl md:text-2xl font-light max-w-2xl mx-auto leading-relaxed mb-12">
            Your limitless productivity space. Manage projects, time, and tasks in a unified, beautiful environment.
          </p>
          
          <Link to={createPageUrl('Dashboard')}>
            <Button 
              size="lg"
              className="rounded-full bg-white/20 hover:bg-white/30 text-white shadow-2xl px-10 py-7 text-xl font-semibold transition-all hover:scale-105 backdrop-blur-sm border border-white/20"
            >
              Create My Workspace <ArrowRight className="ml-3 w-6 h-6" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg mb-4">Everything you need to succeed</h2>
            <p className="text-white/70 text-lg max-w-2xl mx-auto">
              Powerful features designed to streamline your workflow and boost productivity.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Folder className="w-8 h-8" />,
                title: "Project Management",
                description: "Organize projects with boards, lists, and powerful task management tools."
              },
              {
                icon: <Clock className="w-8 h-8" />,
                title: "Time Tracking",
                description: "Track time effortlessly with built-in timers and detailed analytics."
              },
              {
                icon: <Brain className="w-8 h-8" />,
                title: "AI Assistant",
                description: "Meet Jarvis - your AI companion that understands your documents and helps you work smarter."
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: "Team Collaboration",
                description: "Real-time chat, file sharing, and seamless team coordination."
              },
              {
                icon: <GraduationCap className="w-8 h-8" />,
                title: "Learning Tools",
                description: "AI-powered study assistance and course generation for continuous growth."
              },
              {
                icon: <BarChart3 className="w-8 h-8" />,
                title: "Analytics",
                description: "Gain insights with comprehensive dashboards and performance metrics."
              }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur-2xl p-8 rounded-2xl border border-white/20 hover:bg-white/20 transition-all hover:-translate-y-1 group">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-white mb-6 group-hover:bg-white/30 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-white/70 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl p-12 md:p-16 border border-white/20 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to transform your workflow?
            </h2>
            <p className="text-white/70 text-xl mb-10 max-w-2xl mx-auto">
              Join thousands of teams and individuals who have elevated their productivity with Lynck Space.
            </p>
            <Link to={createPageUrl('Dashboard')}>
              <Button 
                size="lg"
                className="rounded-full bg-white/20 hover:bg-white/30 text-white shadow-2xl px-10 py-7 text-xl font-semibold transition-all hover:scale-105 backdrop-blur-sm border border-white/20"
              >
                Get Started Free <ArrowRight className="ml-3 w-6 h-6" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/30 backdrop-blur-2xl border-t border-white/10 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div>
              <div className="text-2xl font-black tracking-tight text-white mb-2">
                LYNCK <span className="text-white/70">SPACE</span>
              </div>
              <p className="text-white/50 text-sm">
                Your limitless productivity space.
              </p>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-white/60 mb-2">
                Contact: <a href="mailto:info@lynckstudio.de" className="text-white/80 hover:text-white transition-colors">info@lynckstudio.de</a>
              </p>
              <div className="flex items-center gap-4 text-sm text-white/40">
                <a href="#" className="hover:text-white/80 transition-colors">Privacy Policy</a>
                <span>|</span>
                <a href="#" className="hover:text-white/80 transition-colors">Terms of Service</a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-12 pt-8 text-center text-white/40 text-sm">
            © 2024 Lynck Space. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}