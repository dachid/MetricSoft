import { useState, useEffect } from 'react'

interface InfographicProps {
  className?: string
}

export function KPITrendInfographic({ className = "" }: InfographicProps) {
  const [animated, setAnimated] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <svg
      viewBox="0 0 400 300"
      className={`w-full h-full ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="trendGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="400" height="300" fill="url(#trendGradient)" rx="12" />

      {/* Title */}
      <text x="200" y="30" textAnchor="middle" className="fill-white text-lg font-semibold">
        KPI Performance Tracking
      </text>

      {/* Chart Area */}
      <rect x="50" y="60" width="300" height="180" fill="rgba(255,255,255,0.1)" rx="8" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />

      {/* Grid Lines */}
      {[80, 110, 140, 170, 200].map((y, i) => (
        <line key={i} x1="60" y1={y} x2="340" y2={y} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
      ))}
      {[80, 140, 200, 260, 320].map((x, i) => (
        <line key={i} x1={x} y1="70" x2={x} y2="230" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
      ))}

      {/* Trend Line */}
      <path
        d="M 70 200 Q 100 180, 130 160 T 190 140 T 250 120 T 320 100"
        fill="none"
        stroke="#10B981"
        strokeWidth="3"
        strokeLinecap="round"
        className={animated ? "animate-pulse" : ""}
        style={{
          strokeDasharray: animated ? "none" : "300",
          strokeDashoffset: animated ? "0" : "300",
          transition: "stroke-dashoffset 2s ease-in-out"
        }}
      />

      {/* Data Points */}
      {[
        { x: 70, y: 200, value: "65%" },
        { x: 130, y: 160, value: "78%" },
        { x: 190, y: 140, value: "85%" },
        { x: 250, y: 120, value: "92%" },
        { x: 320, y: 100, value: "97%" }
      ].map((point, i) => (
        <g key={i}>
          <circle
            cx={point.x}
            cy={point.y}
            r="6"
            fill="#10B981"
            stroke="white"
            strokeWidth="2"
            className={animated ? "animate-bounce" : ""}
            style={{ animationDelay: `${i * 0.2}s` }}
          />
          <text
            x={point.x}
            y={point.y - 15}
            textAnchor="middle"
            className="fill-white text-xs font-medium"
          >
            {point.value}
          </text>
        </g>
      ))}

      {/* Labels */}
      <text x="70" y="255" textAnchor="middle" className="fill-white text-xs">Q1</text>
      <text x="130" y="255" textAnchor="middle" className="fill-white text-xs">Q2</text>
      <text x="190" y="255" textAnchor="middle" className="fill-white text-xs">Q3</text>
      <text x="250" y="255" textAnchor="middle" className="fill-white text-xs">Q4</text>
      <text x="320" y="255" textAnchor="middle" className="fill-white text-xs">Target</text>

      {/* Icons */}
      <g transform="translate(20, 20)">
        <rect width="24" height="24" rx="4" fill="rgba(255,255,255,0.2)" />
        <text x="12" y="16" textAnchor="middle" className="fill-white text-sm">📊</text>
      </g>
    </svg>
  )
}

export function CascadingGoalsInfographic({ className = "" }: InfographicProps) {
  const [animated, setAnimated] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 800)
    return () => clearTimeout(timer)
  }, [])

  return (
    <svg
      viewBox="0 0 400 300"
      className={`w-full h-full ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="cascadeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="400" height="300" fill="url(#cascadeGradient)" rx="12" />

      {/* Title */}
      <text x="200" y="30" textAnchor="middle" className="fill-white text-lg font-semibold">
        Cascading Alignment
      </text>

      {/* Organization Level */}
      <g className={animated ? "animate-fade-in-down" : "opacity-0"}>
        <rect x="150" y="50" width="100" height="40" rx="8" fill="rgba(255,255,255,0.9)" />
        <text x="200" y="65" textAnchor="middle" className="fill-purple-800 text-xs font-medium">Organization</text>
        <text x="200" y="78" textAnchor="middle" className="fill-purple-600 text-xs">Revenue: $10M</text>
      </g>

      {/* Connection Lines */}
      <g className={animated ? "animate-fade-in" : "opacity-0"} style={{ animationDelay: "0.5s" }}>
        <line x1="200" y1="90" x2="120" y2="120" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
        <line x1="200" y1="90" x2="200" y2="120" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
        <line x1="200" y1="90" x2="280" y2="120" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      </g>

      {/* Department Level */}
      <g className={animated ? "animate-fade-in-left" : "opacity-0"} style={{ animationDelay: "0.7s" }}>
        <rect x="70" y="130" width="80" height="35" rx="6" fill="rgba(255,255,255,0.8)" />
        <text x="110" y="145" textAnchor="middle" className="fill-purple-800 text-xs font-medium">Sales</text>
        <text x="110" y="156" textAnchor="middle" className="fill-purple-600 text-xs">$4M</text>
      </g>

      <g className={animated ? "animate-fade-in-up" : "opacity-0"} style={{ animationDelay: "0.9s" }}>
        <rect x="160" y="130" width="80" height="35" rx="6" fill="rgba(255,255,255,0.8)" />
        <text x="200" y="145" textAnchor="middle" className="fill-purple-800 text-xs font-medium">Marketing</text>
        <text x="200" y="156" textAnchor="middle" className="fill-purple-600 text-xs">$3M</text>
      </g>

      <g className={animated ? "animate-fade-in-right" : "opacity-0"} style={{ animationDelay: "1.1s" }}>
        <rect x="250" y="130" width="80" height="35" rx="6" fill="rgba(255,255,255,0.8)" />
        <text x="290" y="145" textAnchor="middle" className="fill-purple-800 text-xs font-medium">Product</text>
        <text x="290" y="156" textAnchor="middle" className="fill-purple-600 text-xs">$3M</text>
      </g>

      {/* Individual Level Connections */}
      <g className={animated ? "animate-fade-in" : "opacity-0"} style={{ animationDelay: "1.3s" }}>
        <line x1="110" y1="165" x2="90" y2="190" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
        <line x1="110" y1="165" x2="130" y2="190" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
        <line x1="200" y1="165" x2="180" y2="190" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
        <line x1="200" y1="165" x2="220" y2="190" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
        <line x1="290" y1="165" x2="270" y2="190" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
        <line x1="290" y1="165" x2="310" y2="190" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
      </g>

      {/* Individual Level */}
      {[
        { x: 60, name: "John", target: "$400K" },
        { x: 100, name: "Sarah", target: "$600K" },
        { x: 150, name: "Mike", target: "$300K" },
        { x: 190, name: "Lisa", target: "$450K" },
        { x: 240, name: "Alex", target: "$350K" },
        { x: 280, name: "Emma", target: "$400K" }
      ].map((person, i) => (
        <g key={i} className={animated ? "animate-fade-in-up" : "opacity-0"} style={{ animationDelay: `${1.5 + i * 0.1}s` }}>
          <rect x={person.x} y="200" width="60" height="30" rx="4" fill="rgba(255,255,255,0.7)" />
          <text x={person.x + 30} y="212" textAnchor="middle" className="fill-purple-800 text-xs font-medium">{person.name}</text>
          <text x={person.x + 30} y="223" textAnchor="middle" className="fill-purple-600 text-xs">{person.target}</text>
        </g>
      ))}

      {/* Icons */}
      <g transform="translate(20, 20)">
        <rect width="24" height="24" rx="4" fill="rgba(255,255,255,0.2)" />
        <text x="12" y="16" textAnchor="middle" className="fill-white text-sm">🎯</text>
      </g>

      {/* Progress Indicator */}
      <g transform="translate(350, 260)">
        <circle cx="15" cy="15" r="12" fill="rgba(255,255,255,0.2)" />
        <text x="15" y="19" textAnchor="middle" className="fill-white text-xs font-bold">92%</text>
      </g>
    </svg>
  )
}

export function RAGStatusInfographic({ className = "" }: InfographicProps) {
  const [animated, setAnimated] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <svg
      viewBox="0 0 400 300"
      className={`w-full h-full ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ragGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#D97706" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="400" height="300" fill="url(#ragGradient)" rx="12" />

      {/* Title */}
      <text x="200" y="30" textAnchor="middle" className="fill-white text-lg font-semibold">
        RAG Status Overview
      </text>

      {/* RAG Grid */}
      <g transform="translate(50, 60)">
        {/* Green Section */}
        <g className={animated ? "animate-fade-in" : "opacity-0"} style={{ animationDelay: "0.2s" }}>
          <rect x="0" y="0" width="90" height="60" rx="8" fill="#10B981" fillOpacity="0.9" />
          <text x="45" y="25" textAnchor="middle" className="fill-white text-sm font-bold">On Track</text>
          <text x="45" y="45" textAnchor="middle" className="fill-white text-2xl font-bold">67%</text>
        </g>

        {/* Amber Section */}
        <g className={animated ? "animate-fade-in" : "opacity-0"} style={{ animationDelay: "0.4s" }}>
          <rect x="110" y="0" width="90" height="60" rx="8" fill="#F59E0B" fillOpacity="0.9" />
          <text x="155" y="25" textAnchor="middle" className="fill-white text-sm font-bold">At Risk</text>
          <text x="155" y="45" textAnchor="middle" className="fill-white text-2xl font-bold">23%</text>
        </g>

        {/* Red Section */}
        <g className={animated ? "animate-fade-in" : "opacity-0"} style={{ animationDelay: "0.6s" }}>
          <rect x="220" y="0" width="90" height="60" rx="8" fill="#EF4444" fillOpacity="0.9" />
          <text x="265" y="25" textAnchor="middle" className="fill-white text-sm font-bold">Behind</text>
          <text x="265" y="45" textAnchor="middle" className="fill-white text-2xl font-bold">10%</text>
        </g>

        {/* Sample KPI Cards */}
        <g transform="translate(0, 80)">
          {[
            { name: "Customer Satisfaction", value: "94%", color: "#10B981", x: 0 },
            { name: "Revenue Growth", value: "87%", color: "#F59E0B", x: 105 },
            { name: "Cost Efficiency", value: "76%", color: "#EF4444", x: 210 }
          ].map((kpi, i) => (
            <g key={i} className={animated ? "animate-fade-in-up" : "opacity-0"} style={{ animationDelay: `${0.8 + i * 0.2}s` }}>
              <rect x={kpi.x} y="0" width="90" height="70" rx="6" fill="rgba(255,255,255,0.9)" />
              <rect x={kpi.x} y="0" width="90" height="8" rx="6" fill={kpi.color} />
              <text x={kpi.x + 45} y="30" textAnchor="middle" className="fill-gray-800 text-xs font-medium">{kpi.name}</text>
              <text x={kpi.x + 45} y="50" textAnchor="middle" className="fill-gray-900 text-xl font-bold">{kpi.value}</text>
              <rect x={kpi.x + 10} y="55" width="70" height="4" rx="2" fill="rgba(0,0,0,0.1)" />
              <rect x={kpi.x + 10} y="55" width={parseInt(kpi.value) * 0.7} height="4" rx="2" fill={kpi.color} />
            </g>
          ))}
        </g>
      </g>

      {/* Icons */}
      <g transform="translate(20, 20)">
        <rect width="24" height="24" rx="4" fill="rgba(255,255,255,0.2)" />
        <text x="12" y="16" textAnchor="middle" className="fill-white text-sm">🚦</text>
      </g>
    </svg>
  )
}

export function InfographicCarousel({ className = "" }: InfographicProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  
  const infographics = [
    { component: KPITrendInfographic, title: "Performance Trends" },
    { component: CascadingGoalsInfographic, title: "Goal Alignment" },
    { component: RAGStatusInfographic, title: "Status Overview" }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % infographics.length)
    }, 5000)
    
    return () => clearInterval(interval)
  }, [infographics.length])

  const CurrentInfographic = infographics[currentIndex].component

  return (
    <div className={`relative ${className}`}>
      <CurrentInfographic className="transition-opacity duration-500" />
      
      {/* Dots indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {infographics.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex ? 'bg-white' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
