import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown, Folder, MessageSquare, BookOpen, Clock, GraduationCap, Link2, Users, BarChart3, Target, Brain } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const [activeDropdown, setActiveDropdown] = useState(null);

  const handleSignUp = () => {
    navigate('/Dashboard');
  };

  const handleSignIn = () => {
    navigate('/Dashboard');
  };

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
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="text-2xl font-black tracking-tight text-slate-900">
              LYNCK <span className="text-indigo-600">SPACE</span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              <a href="#about" className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors">
                About Us
              </a>
              
              {/* Products Dropdown */}
              <div 
                className="relative"
                onMouseEnter={() => setActiveDropdown('products')}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors flex items-center gap-1">
                  Products <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'products' ? 'rotate-180' : ''}`} />
                </button>
                
                {activeDropdown === 'products' && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-[600px]">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 grid grid-cols-2 gap-6">
                      {products.map((product, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm">
                            {product.icon}
                            {product.category}
                          </div>
                          <ul className="space-y-1 pl-7">
                            {product.items.map((item, i) => (
                              <li key={i} className="text-slate-600 text-sm hover:text-indigo-600 cursor-pointer transition-colors">
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
                <button className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors flex items-center gap-1">
                  Solutions <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'solutions' ? 'rotate-180' : ''}`} />
                </button>
                
                {activeDropdown === 'solutions' && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-[280px]">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 space-y-1">
                      {solutions.map((solution, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors group">
                          <span className="text-slate-400 group-hover:text-indigo-600 transition-colors">{solution.icon}</span>
                          <span className="text-slate-700 group-hover:text-indigo-600 font-medium text-sm transition-colors">{solution.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <a href="#pricing" className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors">
                Pricing
              </a>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={handleSignIn} className="text-slate-600 hover:text-slate-900">
                Sign In
              </Button>
              <Button onClick={handleSignUp} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6">
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden" style={{
        background: 'linear-gradient(180deg, #87CEEB 0%, #FFDAB9 50%, #FFA07A 100%)'
      }}>
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-white drop-shadow-xl mb-8">
            LYNCK <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-100 to-white" style={{textShadow: '0 0 40px rgba(255,255,255,0.6)'}}>SPACE</span>
          </h1>
          
          <p className="text-white/90 text-xl md:text-2xl font-light max-w-2xl mx-auto leading-relaxed drop-shadow-md mb-12">
            Your limitless productivity space. Manage projects, time, and tasks in a unified, beautiful environment.
          </p>
          
          <Button 
            size="lg"
            onClick={handleSignUp}
            className="rounded-full bg-white text-indigo-900 hover:bg-indigo-50 shadow-2xl px-10 py-7 text-xl font-semibold transition-all hover:scale-105"
          >
            Create My Workspace <ArrowRight className="ml-3 w-6 h-6" />
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Everything you need to succeed</h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Powerful features designed to streamline your workflow and boost productivity.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
              <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-all hover:-translate-y-1 group">
                <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-6">About Lynck Space</h2>
          </div>
          
          <div className="prose prose-lg max-w-none text-slate-600 space-y-6">
            <p className="text-xl leading-relaxed">
              Lynck Space is the all-in-one productivity platform designed for modern teams and individuals who demand more from their tools.
            </p>
            
            <p className="leading-relaxed">
              We combine project management, time tracking, AI-powered learning, and team collaboration into a single, elegant workspace. Whether you're managing complex projects, studying for exams, or coordinating with your team, Lynck Space adapts to your workflow.
            </p>
            
            <p className="leading-relaxed">
              Our AI assistant, <span className="font-semibold text-indigo-600">Jarvis</span>, acts as your personal productivity companion—understanding your documents, answering questions, and helping you work smarter, not harder.
            </p>
            
            <p className="text-lg font-medium text-slate-800 pt-4">
              Built for flexibility. Designed for productivity. Powered by AI.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6" style={{
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)'
      }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to transform your workflow?
          </h2>
          <p className="text-white/80 text-xl mb-10 max-w-2xl mx-auto">
            Join thousands of teams and individuals who have elevated their productivity with Lynck Space.
          </p>
          <Button 
            size="lg"
            onClick={handleSignUp}
            className="rounded-full bg-white text-indigo-900 hover:bg-indigo-50 shadow-2xl px-10 py-7 text-xl font-semibold transition-all hover:scale-105"
          >
            Get Started Free <ArrowRight className="ml-3 w-6 h-6" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div>
              <div className="text-2xl font-black tracking-tight mb-2">
                LYNCK <span className="text-indigo-400">SPACE</span>
              </div>
              <p className="text-slate-400 text-sm">
                Your limitless productivity space.
              </p>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-slate-400 mb-2">
                Contact: <a href="mailto:info@lynckstudio.de" className="text-indigo-400 hover:text-indigo-300 transition-colors">info@lynckstudio.de</a>
              </p>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                <span>|</span>
                <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-500 text-sm">
            © 2024 Lynck Space. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}