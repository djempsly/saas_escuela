import { describe, it, expect } from 'vitest';
import { sanitizeText, sanitizeOptional } from '../../utils/sanitize';

/**
 * sanitizeText usa `disallowedTagsMode: 'recursiveEscape'`, lo que significa
 * que los tags se escapan a entidades HTML (&lt;script&gt;) en vez de eliminarse.
 * El resultado es seguro: el navegador muestra el texto escapado, no ejecuta nada.
 */
describe('sanitizeText', () => {
  // ─── XSS: tags peligrosos neutralizados ───
  describe('neutraliza tags HTML peligrosos (escapándolos)', () => {
    it('escapa <script> para que no sea ejecutable', () => {
      const result = sanitizeText('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('preserva texto alrededor de <script> escapado', () => {
      const result = sanitizeText('Hola <script>alert("xss")</script> mundo');
      expect(result).toContain('Hola');
      expect(result).toContain('mundo');
      expect(result).not.toContain('<script>');
    });

    it('escapa <iframe>', () => {
      const result = sanitizeText('<iframe src="http://evil.com"></iframe>');
      expect(result).not.toContain('<iframe');
      expect(result).toContain('&lt;iframe');
    });

    it('escapa <object>', () => {
      const result = sanitizeText('<object data="malware.swf"></object>');
      expect(result).not.toContain('<object');
    });

    it('escapa <embed>', () => {
      const result = sanitizeText('<embed src="malware.swf">');
      expect(result).not.toContain('<embed');
    });

    it('escapa <img> con onerror', () => {
      const result = sanitizeText('<img src=x onerror="alert(1)">');
      expect(result).not.toContain('<img');
      expect(result).not.toMatch(/onerror\s*=/i);
    });
  });

  // ─── Event handlers ───
  describe('neutraliza event handlers', () => {
    it('no deja onclick ejecutable', () => {
      const result = sanitizeText('<div onclick="alert(1)">Click me</div>');
      expect(result).toContain('Click me');
      expect(result).not.toMatch(/onclick\s*=\s*"/);
    });

    it('no deja onmouseover ejecutable', () => {
      const result = sanitizeText('<span onmouseover="steal()">hover</span>');
      expect(result).toContain('hover');
      expect(result).not.toMatch(/onmouseover\s*=\s*"/);
    });

    it('no deja onload ejecutable', () => {
      const result = sanitizeText('<body onload="init()">content</body>');
      expect(result).toContain('content');
      expect(result).not.toMatch(/onload\s*=\s*"/);
    });
  });

  // ─── Tags HTML comunes también se escapan ───
  describe('neutraliza todos los tags HTML (allowedTags: [])', () => {
    it('escapa <b> y <strong>, conserva texto', () => {
      const result = sanitizeText('<b>bold</b> <strong>strong</strong>');
      expect(result).toContain('bold');
      expect(result).toContain('strong');
      expect(result).not.toContain('<b>');
      expect(result).not.toContain('<strong>');
    });

    it('escapa <a> y elimina href, conserva texto', () => {
      const result = sanitizeText('<a href="http://evil.com">link</a>');
      expect(result).toContain('link');
      expect(result).not.toMatch(/<a\s/);
    });

    it('escapa <p> y <div>, conserva texto', () => {
      const result = sanitizeText('<p>párrafo</p><div>bloque</div>');
      expect(result).toContain('párrafo');
      expect(result).toContain('bloque');
      expect(result).not.toContain('<p>');
      expect(result).not.toContain('<div>');
    });
  });

  // ─── Texto limpio (sin HTML) ───
  describe('preserva texto plano', () => {
    it('no modifica texto sin HTML', () => {
      expect(sanitizeText('Juan Pérez García')).toBe('Juan Pérez García');
    });

    it('preserva caracteres especiales', () => {
      expect(sanitizeText('Nota: 85/100 (bueno)')).toBe('Nota: 85/100 (bueno)');
    });

    it('preserva acentos y ñ', () => {
      expect(sanitizeText('Educación física y matemáticas')).toBe(
        'Educación física y matemáticas',
      );
    });

    it('preserva números', () => {
      expect(sanitizeText('Grado 1, Sección A')).toBe('Grado 1, Sección A');
    });
  });

  // ─── Whitespace ───
  describe('manejo de espacios', () => {
    it('trimea espacios al inicio y final', () => {
      expect(sanitizeText('  hola  ')).toBe('hola');
    });

    it('string vacío retorna vacío', () => {
      expect(sanitizeText('')).toBe('');
    });

    it('solo espacios retorna vacío', () => {
      expect(sanitizeText('   ')).toBe('');
    });
  });

  // ─── Ataques avanzados ───
  describe('ataques XSS avanzados', () => {
    it('neutraliza javascript: en href', () => {
      const result = sanitizeText('<a href="javascript:alert(1)">click</a>');
      expect(result).not.toMatch(/<a\s/);
    });

    it('neutraliza data: URIs', () => {
      const result = sanitizeText('<a href="data:text/html,<script>alert(1)</script>">x</a>');
      expect(result).not.toMatch(/<a\s/);
    });

    it('neutraliza tags anidados maliciosos', () => {
      const result = sanitizeText('<<script>script>alert(1)<</script>/script>');
      // No debe contener tags ejecutables
      expect(result).not.toContain('<script>');
    });

    it('neutraliza style con expression', () => {
      const result = sanitizeText('<div style="background:expression(alert(1))">x</div>');
      expect(result).toContain('x');
      expect(result).not.toMatch(/style\s*=\s*"/);
    });

    it('neutraliza svg con onload', () => {
      const result = sanitizeText('<svg onload="alert(1)"></svg>');
      expect(result).not.toMatch(/onload\s*=\s*"/);
    });

    it('neutraliza form tags', () => {
      const result = sanitizeText(
        '<form action="http://evil.com"><input type="text"></form>',
      );
      expect(result).not.toContain('<form');
      expect(result).not.toMatch(/action\s*=\s*"/);
    });
  });
});

describe('sanitizeOptional', () => {
  it('retorna null si input es null', () => {
    expect(sanitizeOptional(null)).toBeNull();
  });

  it('retorna undefined si input es undefined', () => {
    expect(sanitizeOptional(undefined)).toBeUndefined();
  });

  it('neutraliza HTML en strings', () => {
    const result = sanitizeOptional('<script>xss</script>texto');
    expect(result).toContain('texto');
    expect(result).not.toContain('<script>');
  });

  it('preserva texto limpio', () => {
    expect(sanitizeOptional('texto normal')).toBe('texto normal');
  });
});
