const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Helper functions
function calculateCheckDigits(base) {
  const numericPart = base.startsWith('PT') ? base.slice(2) : base;
  
  if (numericPart.length !== 16) {
    throw new Error('A parte numérica deve ter 16 dígitos');
  }

  let mod = 0;
  for (let i = 0; i < numericPart.length; i++) {
    const digit = parseInt(numericPart[i], 10);
    if (isNaN(digit)) {
      throw new Error('Caractere inválido na parte numérica');
    }
    mod = (mod * 10 + digit) % 529;
  }

  const table = [
    'T', 'R', 'W', 'A', 'G', 'M', 'Y', 'F', 'P', 'D', 'X',
    'B', 'N', 'J', 'Z', 'S', 'Q', 'V', 'H', 'L', 'C', 'K', 'E'
  ];

  const a = Math.floor(mod / 23);
  const b = mod % 23;

  return table[a] + table[b];
}

function generateRandomCode(digits) {
  let code = '';
  for (let i = 0; i < digits; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

// API Endpoints
app.post('/generate', (req, res) => {
  try {
    const { operator, randomDigits } = req.body;
    
    if (!operator || operator.length !== 4) {
      return res.status(400).json({ error: 'Operador inválido. Deve ter 4 dígitos.' });
    }
    
    const digits = parseInt(randomDigits);
    if (isNaN(digits) || digits < 1 || digits > 12) {
      return res.status(400).json({ error: 'Número de dígitos aleatórios inválido. Deve ser entre 1 e 12.' });
    }
    
    const prefix = 'PT';
    const fixedDigits = 12 - digits;
    const fixedPart = '0'.repeat(fixedDigits);
    const randomPart = generateRandomCode(digits);
    const localCode = fixedPart + randomPart;
    const base = prefix + operator + localCode;
    const checkDigits = calculateCheckDigits(base);
    
    res.json({
      cui: base + checkDigits,
      prefix,
      operator,
      localCode,
      checkDigits,
      randomDigits: digits,
      randomPart
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/validate', (req, res) => {
  try {
    const { cui } = req.body;
    
    if (!cui || cui.length !== 20) {
      return res.status(400).json({ 
        valid: false, 
        message: 'CUI inválido! Deve ter exatamente 20 caracteres.' 
      });
    }
    
    const base = cui.slice(0, -2);
    const providedDigits = cui.slice(-2);
    const calculatedDigits = calculateCheckDigits(base);
    
    res.json({
      valid: providedDigits === calculatedDigits,
      correctDigits: providedDigits === calculatedDigits ? null : calculatedDigits,
      message: providedDigits === calculatedDigits ? 'CUI válido!' : 'CUI inválido!'
    });
  } catch (error) {
    res.status(500).json({ 
      valid: false, 
      message: `Erro na validação: ${error.message}` 
    });
  }
});

app.post('/check-digits', (req, res) => {
  try {
    const { base } = req.body;
    
    if (!base || base.length !== 18) {
      return res.status(400).json({ 
        error: 'Comprimento inválido! Deve ter 18 caracteres (incluindo PT).' 
      });
    }
    
    const checkDigits = calculateCheckDigits(base);
    
    res.json({
      checkDigits,
      cui: base + checkDigits
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CUI API running on port ${PORT}`);
});
