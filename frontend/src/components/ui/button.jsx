import React from "react"

export default function Button({children}) {
  return (
    <button className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">
      {children}
    </button>
  )
}