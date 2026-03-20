import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, AlertTriangle, Cpu, Play, Pause, SkipBack, SkipForward, Volume2, Database, ShieldAlert } from 'lucide-react';

// --- Types ---
interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
}

type Point = { x: number; y: number };

// --- Constants ---
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

const DUMMY_TRACKS: Track[] = [
  {
    id: '1',
    title: 'SYS.MEM.CORRUPT',
    artist: 'UNKNOWN_ENTITY',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: '2',
    title: 'VOID_PROTOCOL',
    artist: 'NULL_POINTER',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: '3',
    title: 'STATIC_INTERFERENCE',
    artist: 'GHOST_IN_MACHINE',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
];

// --- Canvas Snake Game ---
const CanvasSnakeGame: React.FC<{ onScoreUpdate: (score: number) => void }> = ({ onScoreUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [shake, setShake] = useState(0);
  const [isPaused, setIsPaused] = useState(true);

  // Mutable game state for requestAnimationFrame
  const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }]);
  const dirRef = useRef<Point>({ x: 0, y: -1 });
  const nextDirRef = useRef<Point>({ x: 0, y: -1 });
  const foodRef = useRef<Point>({ x: 5, y: 5 });
  const lastTimeRef = useRef<number>(0);
  const speedRef = useRef<number>(80);
  const reqRef = useRef<number | null>(null);

  const spawnFood = useCallback(() => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const isOnSnake = snakeRef.current.some(s => s.x === newFood.x && s.y === newFood.y);
      if (!isOnSnake) break;
    }
    foodRef.current = newFood;
  }, []);

  const resetGame = useCallback(() => {
    snakeRef.current = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
    dirRef.current = { x: 0, y: -1 };
    nextDirRef.current = { x: 0, y: -1 };
    speedRef.current = 80;
    setScore(0);
    onScoreUpdate(0);
    setGameOver(false);
    setIsPaused(false);
    spawnFood();
  }, [onScoreUpdate, spawnFood]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw Grid (subtle)
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= CANVAS_SIZE; i += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_SIZE, i);
      ctx.stroke();
    }

    // Draw Food
    ctx.fillStyle = '#FF00FF'; // Magenta
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#FF00FF';
    ctx.fillRect(foodRef.current.x * CELL_SIZE + 2, foodRef.current.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);

    // Draw Snake
    ctx.fillStyle = '#00FFFF'; // Cyan
    ctx.shadowColor = '#00FFFF';
    
    snakeRef.current.forEach((segment, i) => {
      ctx.shadowBlur = i === 0 ? 20 : 5;
      ctx.globalAlpha = Math.max(0.3, 1 - (i / snakeRef.current.length) * 0.8);
      ctx.fillRect(segment.x * CELL_SIZE + 1, segment.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    });
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
  }, []);

  const update = useCallback((time: number) => {
    if (gameOver || isPaused) {
      draw();
      reqRef.current = requestAnimationFrame(update);
      return;
    }

    if (time - lastTimeRef.current > speedRef.current) {
      lastTimeRef.current = time;

      dirRef.current = nextDirRef.current;
      const head = snakeRef.current[0];
      const newHead = { x: head.x + dirRef.current.x, y: head.y + dirRef.current.y };

      // Collision detection
      if (
        newHead.x < 0 || newHead.x >= GRID_SIZE ||
        newHead.y < 0 || newHead.y >= GRID_SIZE ||
        snakeRef.current.some(s => s.x === newHead.x && s.y === newHead.y)
      ) {
        setGameOver(true);
        setShake(20); // Screen shake juice
        return;
      }

      snakeRef.current.unshift(newHead);

      // Food collision
      if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
        setScore(s => {
          const newScore = s + 10;
          onScoreUpdate(newScore);
          return newScore;
        });
        setShake(5); // Small juice
        speedRef.current = Math.max(40, speedRef.current - 2); // Speed up
        spawnFood();
      } else {
        snakeRef.current.pop();
      }
    }

    draw();
    
    // Handle shake decay
    if (shake > 0) {
      setShake(s => s - 1);
    }

    reqRef.current = requestAnimationFrame(update);
  }, [gameOver, isPaused, draw, spawnFood, onScoreUpdate, shake]);

  useEffect(() => {
    reqRef.current = requestAnimationFrame(update);
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [update]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrow keys and space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowUp': if (dirRef.current.y === 0) nextDirRef.current = { x: 0, y: -1 }; break;
        case 'ArrowDown': if (dirRef.current.y === 0) nextDirRef.current = { x: 0, y: 1 }; break;
        case 'ArrowLeft': if (dirRef.current.x === 0) nextDirRef.current = { x: -1, y: 0 }; break;
        case 'ArrowRight': if (dirRef.current.x === 0) nextDirRef.current = { x: 1, y: 0 }; break;
        case ' ': setIsPaused(p => !p); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const shakeStyle = shake > 0 ? {
    transform: `translate(${(Math.random() - 0.5) * shake}px, ${(Math.random() - 0.5) * shake}px)`
  } : {};

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="w-full flex justify-between items-center border-b-2 border-cyan pb-2">
        <div className="flex items-center gap-2 text-magenta">
          <Database className="w-5 h-5" />
          <span className="text-xl">SCORE:{score.toString().padStart(4, '0')}</span>
        </div>
        <div className="text-cyan animate-pulse">
          {isPaused ? 'SYS.PAUSED' : 'SYS.ACTIVE'}
        </div>
      </div>

      <div 
        className="relative border-glitch bg-black p-1"
        style={shakeStyle}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="block bg-black"
        />

        {gameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
            <ShieldAlert className="w-16 h-16 text-magenta mb-4 animate-bounce" />
            <h2 className="font-pixel text-2xl text-magenta mb-2 text-center leading-relaxed">DATA_CORRUPTION<br/>DETECTED</h2>
            <p className="text-cyan mb-6">FINAL_BYTES: {score}</p>
            <button 
              onClick={resetGame}
              className="border-glitch px-6 py-2 text-cyan hover:bg-cyan hover:text-black transition-colors uppercase"
            >
              REBOOT_SEQUENCE
            </button>
          </div>
        )}

        {isPaused && !gameOver && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
            <AlertTriangle className="w-12 h-12 text-yellow-400 mb-4 animate-pulse" />
            <p className="font-pixel text-yellow-400 text-center leading-relaxed">SYSTEM_HALTED<br/><span className="text-sm text-cyan mt-2 block">[PRESS SPACE TO RESUME]</span></p>
          </div>
        )}
      </div>

      <div className="w-full text-xs text-cyan/60 grid grid-cols-2 gap-2 mt-2">
        <div>&gt; USE_ARROWS_TO_NAVIGATE</div>
        <div className="text-right">&gt; SPACE_TO_HALT_EXECUTION</div>
      </div>
    </div>
  );
};

// --- Audio Stream Component ---
const AudioStream: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = DUMMY_TRACKS[currentIndex];

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  const skipForward = () => {
    setCurrentIndex((prev) => (prev + 1) % DUMMY_TRACKS.length);
    setIsPlaying(true);
  };

  const skipBackward = () => {
    setCurrentIndex((prev) => (prev - 1 + DUMMY_TRACKS.length) % DUMMY_TRACKS.length);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (isPlaying) {
      audioRef.current?.play();
    }
  }, [currentIndex, isPlaying]);

  return (
    <div className="border-glitch p-4 bg-black/80 w-full">
      <div className="flex items-center gap-2 border-b border-cyan/30 pb-2 mb-4">
        <Volume2 className="w-4 h-4 text-cyan" />
        <span className="text-sm uppercase tracking-widest text-cyan">AUDIO_STREAM_ACTIVE</span>
      </div>

      <audio ref={audioRef} src={currentTrack.url} onEnded={skipForward} />
      
      <div className="mb-6">
        <h3 className="font-pixel text-sm text-magenta mb-2 truncate" title={currentTrack.title}>
          {currentTrack.title}
        </h3>
        <p className="text-cyan/60 text-xs uppercase">SRC: {currentTrack.artist}</p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button onClick={skipBackward} className="text-cyan hover:text-magenta transition-colors">
          <SkipBack className="w-6 h-6" />
        </button>
        <button 
          onClick={togglePlay}
          className="border border-cyan p-3 text-cyan hover:bg-cyan hover:text-black transition-all"
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </button>
        <button onClick={skipForward} className="text-cyan hover:text-magenta transition-colors">
          <SkipForward className="w-6 h-6" />
        </button>
      </div>

      {/* Visualizer Mock */}
      <div className="h-8 flex items-end gap-1 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div 
            key={i} 
            className="flex-1 bg-cyan"
            style={{
              height: isPlaying ? `${Math.random() * 100}%` : '10%',
              transition: 'height 0.1s ease',
              opacity: isPlaying ? 0.8 : 0.3
            }}
          />
        ))}
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [highScore, setHighScore] = useState(0);

  const handleScoreUpdate = (score: number) => {
    if (score > highScore) {
      setHighScore(score);
    }
  };

  return (
    <div className="min-h-screen bg-black text-cyan font-sys relative overflow-x-hidden">
      {/* Global Overlays */}
      <div className="static-noise" />
      <div className="scanlines" />
      
      <div className="screen-tear min-h-screen p-4 md:p-8 flex flex-col max-w-7xl mx-auto">
        
        <header className="mb-8 border-b-4 border-magenta pb-6">
          <div className="flex items-center gap-4 mb-4 text-magenta">
            <Terminal className="w-6 h-6 animate-pulse" />
            <span className="text-xl tracking-widest">SYS.OP.TERMINAL_v9.0.1</span>
          </div>
          <h1 
            className="font-pixel text-4xl md:text-6xl lg:text-7xl glitch-text mb-2 break-words"
            data-text="INITIALIZE_SEQUENCE"
          >
            INITIALIZE_SEQUENCE
          </h1>
          <p className="text-cyan/60 text-lg tracking-[0.2em] uppercase">
            &gt; WARNING: JAR_PROTOCOL_ENGAGED // PROCEED_WITH_CAUTION
          </p>
        </header>

        <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 items-start z-10">
          
          {/* Left Panel - System Logs */}
          <aside className="hidden lg:flex flex-col gap-6">
            <div className="border-glitch p-4 bg-black/80">
              <h4 className="text-magenta border-b border-magenta/30 pb-2 mb-4 uppercase tracking-widest flex items-center gap-2">
                <Cpu className="w-4 h-4" /> MEMORY_DUMP
              </h4>
              <div className="space-y-2 text-sm text-cyan/80">
                <p>&gt; ALLOCATING_VRAM... OK</p>
                <p>&gt; MOUNTING_SNAKE.EXE... OK</p>
                <p className="text-yellow-400">&gt; WARN: HIGH_VOLTAGE_DETECTED</p>
                <p>&gt; MAX_BYTES_REACHED: <span className="text-magenta">{highScore}</span></p>
              </div>
            </div>

            <div className="border-glitch p-4 bg-black/80">
              <h4 className="text-magenta border-b border-magenta/30 pb-2 mb-4 uppercase tracking-widest">
                NETWORK_NODES
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between"><span>NODE_ALPHA</span><span className="text-magenta">ERR_CONN</span></li>
                <li className="flex justify-between"><span>NODE_BETA</span><span className="text-cyan">ACTIVE</span></li>
                <li className="flex justify-between"><span>NODE_GAMMA</span><span className="text-cyan">ACTIVE</span></li>
              </ul>
            </div>
          </aside>

          {/* Center - Canvas Game */}
          <section className="flex justify-center w-full max-w-[420px] mx-auto">
            <CanvasSnakeGame onScoreUpdate={handleScoreUpdate} />
          </section>

          {/* Right Panel - Audio & Controls */}
          <aside className="flex flex-col gap-6 w-full max-w-[420px] mx-auto lg:mx-0">
            <AudioStream />
            
            <div className="border-glitch p-4 bg-black/80">
              <h4 className="text-magenta border-b border-magenta/30 pb-2 mb-4 uppercase tracking-widest">
                DIAGNOSTICS
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-cyan/60 block">FPS_TARGET</span>
                  <span className="text-cyan">60.0</span>
                </div>
                <div>
                  <span className="text-cyan/60 block">RENDER_MODE</span>
                  <span className="text-magenta">CANVAS_2D</span>
                </div>
                <div>
                  <span className="text-cyan/60 block">THEME_OVERRIDE</span>
                  <span className="text-yellow-400">GLITCH_ART</span>
                </div>
                <div>
                  <span className="text-cyan/60 block">STATUS</span>
                  <span className="text-cyan animate-pulse">NOMINAL</span>
                </div>
              </div>
            </div>
          </aside>

        </main>

      </div>
    </div>
  );
}
