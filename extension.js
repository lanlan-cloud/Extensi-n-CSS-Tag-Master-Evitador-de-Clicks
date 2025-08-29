const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/**
 * Extensión profesional para extracción inteligente de CSS
 * @author Tu Nombre
 * @version 2.1.0
 * @license MIT + Commercial
 */
class CSSExtractor {
    constructor() {
        this.licenseManager = new LicenseManager();
        this.outputChannel = vscode.window.createOutputChannel('CSS Tag Master Pro');
    }

    /**
     * Activa la extensión
     * @param {vscode.ExtensionContext} context
     */
    activate(context) {
        this.log('Activando CSS Tag Master Pro v2.1.0 - Orden Natural');
        
        // Registrar comandos (quitamos organizeCSS ya que no ordena alfabéticamente)
        const commands = [
            vscode.commands.registerCommand('cssTagMaster.extractAll', () => this.extractAll()),
            vscode.commands.registerCommand('cssTagMaster.extractSelected', () => this.extractSelected()),
            vscode.commands.registerCommand('cssTagMaster.removeDuplicates', () => this.removeDuplicates()),
            vscode.commands.registerCommand('cssTagMaster.organizeByCategory', () => this.organizeByCategory())
        ];

        commands.forEach(command => context.subscriptions.push(command));
        this.showWelcomeMessage();
    }

    /**
     * Organiza propiedades CSS por categorías lógicas (posición, box model, typography, etc.)
     */
    async organizeByCategory() {
        if (!this.licenseManager.validatePremiumFeature('organize-by-category')) return;
        
        try {
            const editor = vscode.window.activeTextEditor;
            if (!this.validateEditor(editor)) return;

            const text = editor.document.getText();
            const organizedCSS = this.organizeByLogicalCategories(text);
            
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
                editor.document.positionAt(0),
                editor.document.positionAt(text.length)
            );
            
            edit.replace(editor.document.uri, fullRange, organizedCSS);
            await vscode.workspace.applyEdit(edit);
            
            vscode.window.showInformationMessage('✅ CSS organizado por categorías lógicas');
            
        } catch (error) {
            this.handleError(error, 'Error al organizar por categorías');
        }
    }

    /**
     * Organiza propiedades CSS por categorías lógicas manteniendo orden dentro de cada categoría
     * @param {string} cssText
     * @returns {string}
     */
    organizeByLogicalCategories(cssText) {
        // Definir categorías y su orden
        const categories = {
            positioning: ['position', 'top', 'right', 'bottom', 'left', 'z-index', 'float', 'clear'],
            boxModel: ['display', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 
                      'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
                      'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
                      'border', 'border-width', 'border-style', 'border-color', 'border-radius',
                      'box-sizing', 'box-shadow', 'overflow', 'overflow-x', 'overflow-y'],
            typography: ['font', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant',
                        'line-height', 'text-align', 'text-decoration', 'text-transform', 'letter-spacing',
                        'word-spacing', 'color', 'text-shadow', 'white-space', 'word-wrap', 'text-overflow'],
            visual: ['background', 'background-color', 'background-image', 'background-position',
                    'background-repeat', 'background-size', 'background-attachment', 'opacity',
                    'visibility', 'cursor', 'list-style', 'outline'],
            animation: ['transition', 'transition-property', 'transition-duration', 'transition-timing-function',
                       'transition-delay', 'animation', 'animation-name', 'animation-duration',
                       'animation-timing-function', 'animation-delay', 'animation-iteration-count',
                       'animation-direction', 'animation-fill-mode', 'animation-play-state'],
            other: ['content', 'quotes', 'counter-reset', 'counter-increment', 'resize', 'clip', 'zoom']
        };

        return cssText.replace(/([^{]+)\{([^}]+)\}/g, (match, selector, properties) => {
            const propsArray = properties.split(';')
                .map(prop => prop.trim())
                .filter(prop => prop);
            
            // Agrupar propiedades por categoría manteniendo orden original dentro de cada categoría
            const categorized = {};
            const uncategorized = [];
            
            propsArray.forEach(prop => {
                const propName = prop.split(':')[0].trim();
                let categorizedFlag = false;
                
                for (const [category, propsList] of Object.entries(categories)) {
                    if (propsList.includes(propName)) {
                        if (!categorized[category]) categorized[category] = [];
                        categorized[category].push(prop);
                        categorizedFlag = true;
                        break;
                    }
                }
                
                if (!categorizedFlag) {
                    uncategorized.push(prop);
                }
            });
            
            // Reconstruir manteniendo orden de categorías pero propiedades en orden original
            let result = [];
            const categoryOrder = ['positioning', 'boxModel', 'typography', 'visual', 'animation', 'other'];
            
            categoryOrder.forEach(category => {
                if (categorized[category]) {
                    result = result.concat(categorized[category]);
                }
            });
            
            result = result.concat(uncategorized);
            
            return `${selector} {\n  ${result.join(';\n  ')};\n}`;
        });
    }

    /**
     * Elimina duplicados manteniendo el último valor (orden de aparición)
     * @param {string} cssText
     * @returns {string}
     */
    removeDuplicateProperties(cssText) {
        return cssText.replace(/([^{]+)\{([^}]+)\}/g, (match, selector, properties) => {
            const propsArray = properties.split(';')
                .map(prop => prop.trim())
                .filter(prop => prop);
            
            // Usar Map para mantener orden pero eliminar duplicados (última aparición gana)
            const uniqueProps = new Map();
            
            propsArray.forEach(prop => {
                const propName = prop.split(':')[0].trim();
                uniqueProps.set(propName, prop);
            });
            
            return `${selector} {\n  ${Array.from(uniqueProps.values()).join(';\n  ')};\n}`;
        });
    }

    /**
     * Parsea etiquetas CSS manteniendo orden de aparición
     * @param {string} text
     * @returns {Array}
     */
    parseCSSTags(text) {
        const selectorRegex = /([^{]+)\s*{([^}]*)}/g;
        const tags = [];
        let match;
        let position = 0;

        while ((match = selectorRegex.exec(text)) !== null) {
            const selector = match[1].trim();
            const properties = match[2].trim();
            
            if (selector && properties) {
                tags.push({
                    selector: selector,
                    properties: properties,
                    fullText: match[0].trim(),
                    position: position++ // Mantener orden de aparición
                });
            }
        }

        // Ordenar por posición de aparición (ya está en orden, pero por si acaso)
        return tags.sort((a, b) => a.position - b.position);
    }

    /**
     * Crea archivo de salida manteniendo orden original
     * @param {Array} tags
     * @param {vscode.TextDocument} originalDoc
     * @param {string} suffix
     */
    async createOutputFile(tags, originalDoc, suffix = '') {
        if (tags.length === 0) {
            vscode.window.showWarningMessage('⚠️ No se encontraron etiquetas CSS para extraer');
            return;
        }

        const originalPath = originalDoc.uri.fsPath;
        const originalDir = path.dirname(originalPath);
        const originalName = path.basename(originalPath, path.extname(originalPath));
        const newPath = path.join(originalDir, `${originalName}-extracted-${suffix}.css`);

        let content = `/* CSS extraído con CSS Tag Master Pro v2.1.0 */\n`;
        content += `/* Archivo original: ${originalName}${path.extname(originalPath)} */\n`;
        content += `/* Fecha: ${new Date().toLocaleDateString()} */\n`;
        content += `/* Orden preservado: ${tags.length} selectores */\n\n`;

        // Mantener el orden original de aparición
        tags.forEach(tag => {
            content += `${tag.selector} {\n  ${tag.properties.replace(/;/g, ';\n  ')}\n}\n\n`;
        });

        try {
            fs.writeFileSync(newPath, content);
            const doc = await vscode.workspace.openTextDocument(newPath);
            await vscode.window.showTextDocument(doc);
            
            this.log(`Archivo creado: ${newPath} con ${tags.length} selectores en orden original`);
        } catch (error) {
            throw new Error(`Error al crear archivo: ${error.message}`);
        }
    }

    // ... (el resto de métodos permanece igual)
}

/**
 * Manager de licencias
 */
class LicenseManager {
    constructor() {
        this.hasPremium = false;
    }

    validatePremiumFeature(feature) {
        if (!this.hasPremium) {
            const featureNames = {
                'organize-by-category': 'Organización por categorías',
                'remove-duplicates': 'Eliminación de duplicados'
            };
            
            vscode.window.showWarningMessage(
                `⚠️ La característica "${featureNames[feature]}" requiere licencia premium\n` +
                `🛒 Visita https://tu-sitio.com/comprar para desbloquear todas las funciones profesionales`,
                'Ver Licencias Premium'
            ).then(selection => {
                if (selection === 'Ver Licencias Premium') {
                    vscode.env.openExternal(vscode.Uri.parse('https://tu-sitio.com/comprar'));
                }
            });
            return false;
        }
        return true;
    }

    hasPremiumLicense() {
        return this.hasPremium;
    }
}

// ... (resto del código permanece igual)
