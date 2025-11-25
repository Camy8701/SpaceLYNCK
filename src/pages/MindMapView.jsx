import React, { useState, useRef, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Brain, Plus, Save, ArrowLeft, Trash2, Download, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";

// Branch colors for main branches from root
const BRANCH_COLORS = [
  '#22c55e', // Green
  '#f59e0b', // Amber/Orange
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#14b8a6', // Teal
  '#ef4444', // Red
  '#06b6d4', // Cyan
];

export default function MindMapView({ sidebarCollapsed }) {
  const [selectedMap, setSelectedMap] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const queryClient = useQueryClient();

  const { data: mindMaps = [], isLoading } = useQuery({
    queryKey: ['mindMaps'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.MindMap.filter({ created_by: user.email }, '-created_date');
    }
  });

  const createMapMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.MindMap.create({
        name: newMapName,
        nodes: [{ 
          id: 'root', 
          text: newMapName, 
          x: 500, 
          y: 350, 
          color: '#1e40af',
          isRoot: true,
          parentId: null
        }],
        connections: []
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['mindMaps']);
      setSelectedMap(data);
      setNewMapName('');
      setShowCreate(false);
      toast.success('Mind map created!');
    }
  });

  if (selectedMap) {
    return (
      <MindMapEditor 
        map={selectedMap} 
        onBack={() => setSelectedMap(null)}
        sidebarCollapsed={sidebarCollapsed}
      />
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
      <div className="p-6 lg:p-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            <Brain className="w-6 h-6" /> Mind Maps
          </h1>
          <Button onClick={() => setShowCreate(true)} className="bg-white/20 hover:bg-white/30 text-white border border-white/30">
            <Plus className="w-4 h-4 mr-2" /> New Map
          </Button>
        </div>

        {showCreate && (
          <Card className="p-4 mb-6 bg-white/50 backdrop-blur-md border border-white/40 rounded-xl">
            <div className="flex gap-3">
              <Input 
                value={newMapName}
                onChange={(e) => setNewMapName(e.target.value)}
                placeholder="Mind map name..."
                className="bg-white/30 border-white/30 text-slate-800"
                onKeyDown={(e) => e.key === 'Enter' && newMapName && createMapMutation.mutate()}
              />
              <Button onClick={() => createMapMutation.mutate()} disabled={!newMapName} className="bg-blue-600 hover:bg-blue-700">
                Create
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-white">
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-white/70">Loading...</div>
        ) : mindMaps.length === 0 ? (
          <Card className="p-12 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl text-center">
            <Brain className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600 mb-4">No mind maps yet. Create your first one!</p>
            <Button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Create Mind Map
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mindMaps.map(map => (
              <Card 
                key={map.id}
                onClick={() => setSelectedMap(map)}
                className="p-6 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl cursor-pointer hover:bg-white/60 transition-all hover:-translate-y-1"
              >
                <Brain className="w-10 h-10 text-purple-500 mb-3" />
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{map.name}</h3>
                <p className="text-slate-600 text-sm">{map.nodes?.length || 0} nodes</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MindMapEditor({ map, onBack, sidebarCollapsed }) {
  const [nodes, setNodes] = useState(map.nodes || []);
  const [connections, setConnections] = useState(map.connections || []);
  const [selectedNode, setSelectedNode] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const [draggingNode, setDraggingNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const queryClient = useQueryClient();

  // Count main branches for color assignment
  const getNodeColor = useCallback((node) => {
    if (node.isRoot) return '#1e3a5f'; // Dark blue for root
    
    // Find the main branch ancestor
    let current = node;
    let mainBranchIndex = 0;
    
    while (current.parentId) {
      const parent = nodes.find(n => n.id === current.parentId);
      if (!parent) break;
      if (parent.isRoot) {
        // This is a direct child of root - main branch
        const mainBranches = nodes.filter(n => n.parentId === 'root');
        mainBranchIndex = mainBranches.findIndex(n => n.id === current.id);
        break;
      }
      current = parent;
    }
    
    // If this node IS a main branch (direct child of root)
    if (node.parentId === 'root') {
      const mainBranches = nodes.filter(n => n.parentId === 'root');
      mainBranchIndex = mainBranches.findIndex(n => n.id === node.id);
    }
    
    return BRANCH_COLORS[mainBranchIndex % BRANCH_COLORS.length];
  }, [nodes]);

  // Get connection color based on the child node's branch color
  const getConnectionColor = useCallback((fromId, toId) => {
    const toNode = nodes.find(n => n.id === toId);
    if (!toNode) return '#22c55e';
    
    // Find the main branch this connection belongs to
    let current = toNode;
    while (current.parentId && current.parentId !== 'root') {
      const parent = nodes.find(n => n.id === current.parentId);
      if (!parent) break;
      current = parent;
    }
    
    // Get the color of the main branch
    if (current.parentId === 'root') {
      const mainBranches = nodes.filter(n => n.parentId === 'root');
      const index = mainBranches.findIndex(n => n.id === current.id);
      return BRANCH_COLORS[index % BRANCH_COLORS.length];
    }
    
    return '#22c55e';
  }, [nodes]);

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.MindMap.update(map.id, { nodes, connections }),
    onSuccess: () => {
      queryClient.invalidateQueries(['mindMaps']);
      toast.success('Mind map saved!');
    }
  });

  const addChildNode = (parentNode) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 150 + Math.random() * 50;
    const newX = parentNode.x + Math.cos(angle) * distance;
    const newY = parentNode.y + Math.sin(angle) * distance;

    const newNode = {
      id: Date.now().toString(),
      text: 'New idea',
      x: newX,
      y: newY,
      parentId: parentNode.id,
      isRoot: false
    };
    
    setNodes([...nodes, newNode]);
    setConnections([...connections, { from: parentNode.id, to: newNode.id }]);
    setEditingNode(newNode.id);
  };

  const updateNodeText = (id, text) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, text } : n));
  };

  const deleteNode = (id) => {
    // Don't delete root
    const node = nodes.find(n => n.id === id);
    if (node?.isRoot) {
      toast.error("Cannot delete root node");
      return;
    }
    
    // Delete node and all descendants
    const toDelete = new Set([id]);
    const findDescendants = (parentId) => {
      nodes.forEach(n => {
        if (n.parentId === parentId && !toDelete.has(n.id)) {
          toDelete.add(n.id);
          findDescendants(n.id);
        }
      });
    };
    findDescendants(id);
    
    setNodes(nodes.filter(n => !toDelete.has(n.id)));
    setConnections(connections.filter(c => !toDelete.has(c.from) && !toDelete.has(c.to)));
    setSelectedNode(null);
  };

  const handleMouseDown = (e, node) => {
    if (e.button === 0) {
      e.stopPropagation();
      setDraggingNode(node.id);
      setSelectedNode(node.id);
    }
  };

  const handleCanvasMouseDown = (e) => {
    if (e.button === 0 && !draggingNode) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedNode(null);
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (draggingNode && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      setNodes(prev => prev.map(n => n.id === draggingNode ? { ...n, x, y } : n));
    } else if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  }, [draggingNode, isPanning, pan, panStart, zoom]);

  const handleMouseUp = () => {
    setDraggingNode(null);
    setIsPanning(false);
  };

  // Generate curved path between two points
  const getCurvedPath = (from, to) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const cx1 = from.x + dx * 0.4;
    const cy1 = from.y;
    const cx2 = from.x + dx * 0.6;
    const cy2 = to.y;
    return `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`;
  };

  const exportToPNG = () => {
    toast.success('Export feature - use screenshot for now');
  };

  return (
    <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
      <div className="p-4 lg:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} className="text-white/80 hover:text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <h1 className="text-xl font-bold text-white">{map.name}</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setZoom(z => Math.min(z + 0.2, 2))} variant="outline" size="icon" className="bg-white/10 border-white/30 text-white">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))} variant="outline" size="icon" className="bg-white/10 border-white/30 text-white">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button onClick={() => saveMutation.mutate()} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" /> Save
            </Button>
          </div>
        </div>

        {/* Canvas - Dark background like the reference */}
        <div 
          ref={canvasRef}
          className="relative h-[80vh] bg-[#1a1a2e] rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div 
            style={{ 
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              width: '100%',
              height: '100%'
            }}
          >
            {/* Connections - Curved lines like in reference */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
              <defs>
                {connections.map((conn, idx) => (
                  <linearGradient key={`grad-${idx}`} id={`gradient-${idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={getConnectionColor(conn.from, conn.to)} />
                    <stop offset="100%" stopColor={getConnectionColor(conn.from, conn.to)} />
                  </linearGradient>
                ))}
              </defs>
              {connections.map((conn, idx) => {
                const fromNode = nodes.find(n => n.id === conn.from);
                const toNode = nodes.find(n => n.id === conn.to);
                if (!fromNode || !toNode) return null;
                
                const color = getConnectionColor(conn.from, conn.to);
                
                return (
                  <path
                    key={idx}
                    d={getCurvedPath(fromNode, toNode)}
                    stroke={color}
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
                  />
                );
              })}
            </svg>

            {/* Nodes */}
            {nodes.map(node => {
              const nodeColor = node.color || getNodeColor(node);
              const isRoot = node.isRoot;
              
              return (
                <div
                  key={node.id}
                  className={`absolute select-none transition-shadow ${
                    selectedNode === node.id ? 'z-20' : 'z-10'
                  }`}
                  style={{
                    left: node.x,
                    top: node.y,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  {/* Node bubble */}
                  <div
                    className={`relative cursor-move rounded-full px-5 py-3 border-2 ${
                      isRoot ? 'border-cyan-400/60' : 'border-transparent'
                    } ${selectedNode === node.id ? 'ring-2 ring-white/50' : ''}`}
                    style={{
                      backgroundColor: nodeColor,
                      boxShadow: `0 4px 20px ${nodeColor}60, inset 0 1px 0 rgba(255,255,255,0.2)`,
                      minWidth: isRoot ? '180px' : '100px'
                    }}
                    onMouseDown={(e) => handleMouseDown(e, node)}
                    onDoubleClick={() => setEditingNode(node.id)}
                  >
                    {editingNode === node.id ? (
                      <input
                        autoFocus
                        value={node.text}
                        onChange={(e) => updateNodeText(node.id, e.target.value)}
                        onBlur={() => setEditingNode(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingNode(null)}
                        className="bg-transparent text-white text-center w-full outline-none font-semibold"
                        style={{ minWidth: '80px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-white font-semibold text-sm whitespace-nowrap">{node.text}</span>
                    )}
                  </div>

                  {/* Add child button (+) */}
                  <button
                    onClick={(e) => { e.stopPropagation(); addChildNode(node); }}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-all opacity-0 hover:opacity-100 group-hover:opacity-100"
                    style={{ opacity: selectedNode === node.id ? 1 : undefined }}
                    title="Add branch"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {/* Delete button (only for non-root, when selected) */}
                  {selectedNode === node.id && !isRoot && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Instructions */}
          <div className="absolute bottom-4 left-4 text-white/40 text-xs space-y-1">
            <p>Drag background to pan • Scroll to zoom</p>
            <p>Click + to add branch • Double-click to edit • Drag nodes to move</p>
          </div>

          {/* Zoom indicator */}
          <div className="absolute bottom-4 right-4 text-white/40 text-xs">
            {Math.round(zoom * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
}