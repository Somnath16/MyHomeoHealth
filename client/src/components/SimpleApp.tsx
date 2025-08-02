import { useState } from "react";

// Simple test component to isolate React issues
export default function SimpleApp() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">
          My Homeo Health
        </h1>
        <p className="text-gray-600">
          Application is loading...
        </p>
        <button
          onClick={() => setCount(count + 1)}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
        >
          Test Counter: {count}
        </button>
        <div className="text-sm text-gray-500">
          If you can see this and the counter works, React is functioning properly.
        </div>
      </div>
    </div>
  );
}