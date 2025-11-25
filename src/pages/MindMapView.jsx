import React, { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Brain, Plus, Save, ArrowLeft, Trash2, Move, Download } from "lucide-react";
import { toast } from "sonner";

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
        nodes: [{ id: '1', text: newMapName, x: 400, y: 300, color: '#3b82f6' }],
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            <Brain className="w-6 h-6" /> Mind Maps
          </h1>
          <Button onClick={() => setShowCreate(true)} className="bg-white/20 hover:bg-white/30 text-white border border-white/30">
            <Plus className="w-4 h-4 mr-2" /> New Map
          </Button>
        </div>

        {/* Create Modal */}
        {showCreate && (
          <Card className="p-4 mb-6 bg-white/50 backdrop-blur-md border border-white/40 rounded-xl">
            <div className="flex gap-3">
              <Input 
                value={newMapName}
                onChange={(e) => setNewMapName(e.target.value)}
                placeholder="Mind map name..."
                className="bg-white/30 border-white/30 text-slate-800"
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

        {/* Mind Maps Grid */}
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
  const [connectingFrom, setConnectingFrom] = useState(null);
  const canvasRef = useRef(null);
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.MindMap.update(map.id, { nodes, connections }),
    onSuccess: () => {
      queryClient.invalidateQueries(['mindMaps']);
      toast.success('Mind map saved!');
    }
  });

  const exportToPNG = () => {
    if (!canvasRef.current) return;
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const rect = canvasRef.current.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    
    // Fill background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    // Draw connections
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    connections.forEach(conn => {
      const fromNode = nodes.find(n => n.id === conn.from);
      const toNode = nodes.find(n => n.id === conn.to);
      if (fromNode && toNode) {
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.stroke();
      }
    });
    
    // Draw nodes
    nodes.forEach(node => {
      ctx.fillStyle = node.color || '#3b82f6';
      ctx.beginPath();
      ctx.roundRect(node.x - 60, node.y - 20, 120, 40, 8);
      ctx.fill();
      
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.text, node.x, node.y);
    });
    
    // Download
    const link = document.createElement('a');
    link.download = `${map.name}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Mind map exported as PNG!');
  };

  const addNode = () => {
    const newNode = {
      id: Date.now().toString(),
      text: 'New Node',
      x: 200 + Math.random() * 400,
      y: 200 + Math.random() * 200,
      color: '#' + Math.floor(Math.random()*16777215).toString(16)
    };
    setNodes([...nodes, newNode]);
    setEditingNode(newNode.id);
  };

  const updateNodeText = (id, text) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, text } : n));
  };

  const deleteNode = (id) => {
    setNodes(nodes.filter(n => n.id !== id));
    setConnections(connections.filter(c => c.from !== id && c.to !== id));
    setSelectedNode(null);
  };

  const handleMouseDown = (e, node) => {
    if (e.button === 0) {
      setDraggingNode(node.id);
      setSelectedNode(node.id);
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (draggingNode && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setNodes(nodes.map(n => n.id === draggingNode ? { ...n, x, y } : n));
    }
  }, [draggingNode, nodes]);

  const handleMouseUp = () => {
    setDraggingNode(null);
  };

  const startConnection = (nodeId) => {
    if (connectingFrom) {
      if (connectingFrom !== nodeId) {
        setConnections([...connections, { from: connectingFrom, to: nodeId }]);
      }
      setConnectingFrom(null);
    } else {
      setConnectingFrom(nodeId);
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
      <div className="p-6 lg:p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} className="text-white/80 hover:text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <h1 className="text-xl font-bold text-white">{map.name}</h1>
          </div>
          <div className="flex gap-3">
            <Button onClick={addNode} variant="outline" className="bg-white/10 border-white/30 text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Node
            </Button>
            <Button onClick={exportToPNG} variant="outline" className="bg-white/10 border-white/30 text-white">
              <Download className="w-4 h-4 mr-2" /> Export PNG
            </Button>
            <Button onClick={() => saveMutation.mutate()} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" /> Save
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <Card 
          ref={canvasRef}
          className="relative h-[70vh] bg-white/30 backdrop-blur-md border border-white/40 rounded-2xl overflow-hidden"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {connections.map((conn, idx) => {
              const fromNode = nodes.find(n => n.id === conn.from);
              const toNode = nodes.find(n => n.id === conn.to);
              if (!fromNode || !toNode) return null;
              return (
                <line
                  key={idx}
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="2"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map(node => (
            <div
              key={node.id}
              className={`absolute cursor-move select-none ${
                selectedNode === node.id ? 'ring-2 ring-white' : ''
              } ${connectingFrom === node.id ? 'ring-2 ring-blue-400' : ''}`}
              style={{
                left: node.x - 60,
                top: node.y - 25,
                backgroundColor: node.color || '#3b82f6'
              }}
              onMouseDown={(e) => handleMouseDown(e, node)}
              onDoubleClick={() => setEditingNode(node.id)}
            >
              <div className="px-4 py-2 rounded-lg min-w-[120px] text-center">
                {editingNode === node.id ? (
                  <input
                    autoFocus
                    value={node.text}
                    onChange={(e) => updateNodeText(node.id, e.target.value)}
                    onBlur={() => setEditingNode(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingNode(null)}
                    className="bg-transparent text-white text-center w-full outline-none"
                  />
                ) : (
                  <span className="text-white font-medium">{node.text}</span>
                )}
              </div>
              
              {/* Node Actions */}
              {selectedNode === node.id && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); startConnection(node.id); }}
                    className="p-1 bg-blue-600 rounded text-white text-xs hover:bg-blue-700"
                    title="Connect"
                  >
                    <Move className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                    className="p-1 bg-red-600 rounded text-white text-xs hover:bg-red-700"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Instructions */}
          <div className="absolute bottom-4 left-4 text-slate-600 text-sm">
            Drag to move • Double-click to edit • Click node actions to connect/delete
          </div>
        </Card>
      </div>
    </div>
  );
}