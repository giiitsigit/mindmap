import { Node, Edge, MarkerType } from 'reactflow';
import { nanoid } from 'nanoid';
import { Theme, LayoutOrientation } from './types';

export function parseTextToFlow(text: string, theme: Theme, orientation: LayoutOrientation = 'horizontal'): { nodes: Node[]; edges: Edge[] } {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const stack: { id: string; indent: number }[] = [];

  lines.forEach((line, index) => {
    const indent = line.search(/\S/);
    const content = line.trim();
    const id = nanoid();
    
    // Position calculation based on orientation
    const depth = indent / 2;
    let x, y;

    if (orientation === 'vertical') {
      x = index * 200;
      y = depth * 150;
    } else {
      x = depth * 250;
      y = index * 100;
    }

    nodes.push({
      id,
      data: { label: content },
      position: { x, y },
      type: 'default',
      className: depth === 0 ? 'react-flow__node-root' : '',
      style: getThemeStyle(theme, depth === 0),
    });

    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    if (stack.length > 0) {
      const parent = stack[stack.length - 1];
      edges.push({
        id: `e-${parent.id}-${id}`,
        source: parent.id,
        target: id,
        animated: theme === 'cyberpunk',
        style: getEdgeStyle(theme),
        markerEnd: theme === 'minimal' ? undefined : { type: MarkerType.ArrowClosed, color: getEdgeColor(theme) },
      });
    }

    stack.push({ id, indent });
  });

  return { nodes, edges };
}

function getThemeStyle(theme: Theme, isRoot: boolean) {
  switch (theme) {
    case 'cyberpunk':
      return {
        background: isRoot ? '#00f2fe' : '#1a1a1a',
        color: isRoot ? '#000' : '#0ff',
        border: '2px solid #0ff',
        boxShadow: '0 0 10px #0ff',
        borderRadius: '0px',
        padding: '10px',
        fontFamily: 'monospace',
      };
    case 'organic':
      return {
        background: isRoot ? '#829281' : '#fff',
        color: isRoot ? '#fff' : '#4A443F',
        border: isRoot ? '4px solid #fff' : '1px solid #E8E2D9',
        borderRadius: isRoot ? '16px' : '12px',
        padding: isRoot ? '16px 24px' : '12px 16px',
        fontFamily: isRoot ? 'serif' : 'inherit',
        fontStyle: isRoot ? 'italic' : 'normal',
        boxShadow: isRoot ? '0 10px 15px -3px rgb(0 0 0 / 0.1)' : '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      };
    case 'brutalist':
      return {
        background: isRoot ? '#ffde00' : '#fff',
        color: '#000',
        border: '3px solid #000',
        borderRadius: '0px',
        boxShadow: '4px 4px 0px #000',
        fontWeight: 'bold',
      };
    case 'minimal':
      return {
        background: 'transparent',
        color: '#4b5563',
        border: isRoot ? '1px solid #e5e7eb' : 'none',
        borderRadius: '4px',
        padding: '8px',
      };
    default: // modern
      return {
        background: isRoot ? '#3b82f6' : '#fff',
        color: isRoot ? '#fff' : '#1f2937',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '10px 16px',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      };
  }
}

function getEdgeStyle(theme: Theme) {
  const color = getEdgeColor(theme);
  switch (theme) {
    case 'cyberpunk': return { stroke: color, strokeWidth: 2 };
    case 'organic': return { stroke: color, strokeWidth: 3 };
    case 'brutalist': return { stroke: '#000', strokeWidth: 4 };
    default: return { stroke: color };
  }
}

function getEdgeColor(theme: Theme) {
  switch (theme) {
    case 'cyberpunk': return '#0ff';
    case 'organic': return '#166534';
    case 'minimal': return '#d1d5db';
    case 'brutalist': return '#000';
    default: return '#3b82f6';
  }
}
