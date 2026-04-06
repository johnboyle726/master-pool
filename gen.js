const fs = require('fs');
const app = [];
app.push("import { useState, useEffect, useMemo, useCallback } from 'react'");
app.push("import { supabase } from './lib/supabase.js'");
app.push("import { calcEntry, getBestAmScore, getAmScore, fmtScore, scoreClass } from './lib/scoring.js'");
app.push("");
app.push("const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'Master2026!!'");
app.push("");
app.push("export default function App() {");
