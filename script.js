// ========================================
//  CONFIG
// ========================================
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const STORAGE_KEY = 'mk_masterchef_groq_api_key';
const TOTAL_INPUTS = 10;

// ========================================
//  TOAST NOTIFICATIONS
// ========================================
function showToast(message, type = 'success', icon = '✅') {
    const toast = document.getElementById('toast');
    toast.className = `toast ${type}`;
    document.getElementById('toastText').textContent = message;
    document.getElementById('toastIcon').textContent = icon;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ========================================
//  API KEY MANAGEMENT
// ========================================
function getApiKey() {
    return localStorage.getItem(STORAGE_KEY) || '';
}

function saveApiKey() {
    const input = document.getElementById('apiKeyInput');
    const key = input.value.trim();

    if (!key) {
        showToast('Please enter an API key!', 'warning', '⚠️');
        input.focus();
        return;
    }

    if (!key.startsWith('gsk_')) {
        showToast('Invalid format. Groq keys start with "gsk_"', 'error', '❌');
        return;
    }

    if (key.length < 20) {
        showToast('Key seems too short.', 'error', '❌');
        return;
    }

    localStorage.setItem(STORAGE_KEY, key);
    updateApiStatus(true);
    input.classList.add('saved');

    const btn = document.getElementById('saveKeyBtn');
    document.getElementById('saveIcon').textContent = '✅';
    document.getElementById('saveText').textContent = 'Saved!';
    btn.classList.add('saved');

    setTimeout(() => {
        document.getElementById('saveIcon').textContent = '💾';
        document.getElementById('saveText').textContent = 'Save';
        btn.classList.remove('saved');
    }, 2500);

    showToast('API key saved securely!', 'success', '🔑');
}

function removeApiKey() {
    localStorage.removeItem(STORAGE_KEY);
    const input = document.getElementById('apiKeyInput');
    input.value = '';
    input.classList.remove('saved');
    updateApiStatus(false);
    showToast('API key removed', 'warning', '🗑️');
}

function updateApiStatus(connected) {
    const status = document.getElementById('apiStatus');
    const text = document.getElementById('apiStatusText');
    const removeBtn = document.getElementById('removeKeyBtn');

    if (connected) {
        status.className = 'api-status connected';
        text.textContent = 'Connected';
        removeBtn.classList.add('show');
    } else {
        status.className = 'api-status disconnected';
        text.textContent = 'Not Connected';
        removeBtn.classList.remove('show');
    }
}

function toggleKeyVisibility() {
    const input = document.getElementById('apiKeyInput');
    const btn = document.getElementById('toggleVisibility');
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
    }
}

function initApiKey() {
    const savedKey = getApiKey();
    if (savedKey) {
        document.getElementById('apiKeyInput').value = savedKey;
        document.getElementById('apiKeyInput').classList.add('saved');
        updateApiStatus(true);
    }
}

// ========================================
//  INGREDIENT COUNTER
// ========================================
function updateIngredientCounter() {
    let count = 0;
    for (let i = 1; i <= TOTAL_INPUTS; i++) {
        if (document.getElementById(`ingredient${i}`).value.trim()) count++;
    }
    const counter = document.getElementById('ingredientCounter');
    counter.textContent = `${count} / ${TOTAL_INPUTS}`;
    counter.style.color = count > 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(16, 185, 129, 0.6)';
}

// ========================================
//  COLLECT ALL INGREDIENTS
// ========================================
function getAllIngredients() {
    const values = [];
    for (let i = 1; i <= TOTAL_INPUTS; i++) {
        const val = document.getElementById(`ingredient${i}`).value.trim();
        if (val) values.push(val);
    }
    return values;
}

function getAllInputElements() {
    const inputs = [];
    for (let i = 1; i <= TOTAL_INPUTS; i++) {
        inputs.push(document.getElementById(`ingredient${i}`));
    }
    return inputs;
}

// ========================================
//  AI-POWERED INGREDIENT VALIDATION
// ========================================
async function validateIngredientsWithAI(ingredients, apiKey) {
    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    {
                        role: 'system',
                        content: `You are a strict food ingredient validator. Check if each item is a REAL food/cooking ingredient.

VALID: Any real food, spice, herb, condiment, cooking oil, dairy, grain, meat, seafood, vegetable, fruit, nut, seed, sauce, broth, baking ingredient.
INVALID: Random words, gibberish, non-food objects (electronics, furniture, clothing), names, places, abstract concepts, slang, nonsense.

RESPOND ONLY in exact JSON:
{"valid": true, "invalid_items": []}
OR
{"valid": false, "invalid_items": ["item1", "item2"]}

Be VERY strict. No explanations. Only JSON.`
                    },
                    {
                        role: 'user',
                        content: `Validate these ingredients: ${ingredients}`
                    }
                ],
                temperature: 0,
                max_tokens: 300
            })
        });

        if (response.status === 401) {
            return { valid: false, invalid_items: [], error: 'invalid_key' };
        }

        if (!response.ok) throw new Error('Validation failed');

        const data = await response.json();
        const content = data.choices[0].message.content.trim();
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        return { valid: true, invalid_items: [] };

    } catch (error) {
        console.error('AI Validation error:', error);
        return localValidation(ingredients);
    }
}

// ========================================
//  LOCAL FALLBACK VALIDATION
// ========================================
const FOOD_KEYWORDS = [
    'chicken','beef','pork','lamb','fish','salmon','tuna','shrimp','prawn','crab','lobster','turkey','duck',
    'bacon','sausage','ham','steak','egg','eggs','tofu','tempeh','paneer','mutton','veal','cod','tilapia',
    'squid','octopus','clam','mussel','oyster','scallop','anchovy','sardine','mackerel',
    'tomato','onion','garlic','potato','carrot','broccoli','spinach','lettuce','cabbage','cauliflower',
    'pepper','bell pepper','chili','jalapeno','celery','cucumber','zucchini','eggplant','mushroom','corn',
    'pea','peas','bean','beans','asparagus','artichoke','beet','radish','turnip','sweet potato','squash',
    'pumpkin','kale','arugula','bok choy','leek','scallion','shallot','okra','fennel','ginger','lemongrass',
    'apple','banana','orange','lemon','lime','mango','pineapple','strawberry','blueberry','raspberry',
    'grape','watermelon','melon','peach','pear','plum','cherry','coconut','avocado','fig','date','kiwi',
    'rice','pasta','noodle','noodles','bread','flour','oat','oats','quinoa','barley','wheat','couscous',
    'tortilla','pita','roti','naan','spaghetti','penne','fettuccine','lasagna','ramen','udon','macaroni',
    'milk','cheese','butter','cream','yogurt','ghee','sour cream','mozzarella','cheddar','parmesan',
    'feta','ricotta','cream cheese','buttermilk','whey',
    'salt','pepper','cumin','turmeric','paprika','cinnamon','oregano','basil','thyme','rosemary',
    'parsley','cilantro','coriander','mint','dill','sage','bay leaf','cardamom','nutmeg','clove',
    'saffron','garam masala','chili powder','cayenne','tarragon','sumac',
    'olive oil','oil','vegetable oil','sesame oil','coconut oil','vinegar','soy sauce','fish sauce',
    'oyster sauce','mustard','ketchup','mayo','mayonnaise','hot sauce','sriracha','tahini','pesto',
    'salsa','miso','hoisin','teriyaki','worcestershire','bbq sauce',
    'almond','walnut','cashew','peanut','pistachio','pecan','hazelnut','sesame','chia','flax',
    'sugar','honey','maple syrup','vanilla','chocolate','cocoa','baking soda','baking powder','yeast',
    'cornstarch','brown sugar','molasses','stevia',
    'lentil','lentils','chickpea','chickpeas','hummus','dal','edamame',
    'water','broth','stock','wine','coconut milk','almond milk','soy milk','tomato paste','tomato sauce',
    'breadcrumb','breadcrumbs','panko'
];

function localValidation(ingredientString) {
    const items = ingredientString.toLowerCase().split(',').map(i => i.trim()).filter(i => i);
    const invalidItems = [];

    for (const item of items) {
        let found = false;
        for (const kw of FOOD_KEYWORDS) {
            if (item.includes(kw) || kw.includes(item)) {
                found = true;
                break;
            }
        }
        if (!found) {
            const words = item.split(/\s+/);
            for (const w of words) {
                if (w.length < 2) continue;
                for (const kw of FOOD_KEYWORDS) {
                    if (kw.includes(w) || w.includes(kw)) {
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
        }
        if (!found) invalidItems.push(item);
    }

    return invalidItems.length > 0
        ? { valid: false, invalid_items: invalidItems }
        : { valid: true, invalid_items: [] };
}

// ========================================
//  ERROR OVERLAY
// ========================================
function showError(invalidItems, isApiError = false) {
    const overlay = document.getElementById('errorOverlay');
    const card = document.getElementById('errorCard');
    const container = document.getElementById('errorItems');
    const icon = document.getElementById('errorIcon');
    const title = document.getElementById('errorTitle');
    const subtitle = document.getElementById('errorSubtitle');

    if (isApiError) {
        card.classList.add('api-error');
        icon.textContent = '🔑';
        title.textContent = 'API Key Required!';
        subtitle.innerHTML = 'Please enter a valid Groq API key to use MK Master Chef.<br>Click "Create API Key" to get one for free!';
        container.innerHTML = '';
    } else {
        card.classList.remove('api-error');
        icon.textContent = '🚫';
        title.textContent = 'Invalid Ingredients Detected!';
        subtitle.innerHTML = "These don't look like real food ingredients.<br>Please enter actual cooking ingredients only.";
        container.innerHTML = invalidItems.map(item =>
            `<span class="error-tag"><span class="cross">✕</span>${item}</span>`
        ).join('');

        // Highlight invalid inputs
        getAllInputElements().forEach(input => {
            const val = input.value.trim().toLowerCase();
            if (!val) return;
            const items = val.split(',').map(i => i.trim());
            for (const item of items) {
                if (invalidItems.some(inv => inv.toLowerCase() === item || item.includes(inv.toLowerCase()))) {
                    input.classList.add('input-error');
                    break;
                }
            }
        });
    }

    overlay.classList.add('show');
}

function closeError() {
    document.getElementById('errorOverlay').classList.remove('show');
}

// ========================================
//  COOK MAGIC — MAIN FUNCTION
// ========================================
async function cookMagic() {
    const apiKey = getApiKey();
    const btn = document.getElementById('cookBtn');
    const responseSection = document.getElementById('responseSection');
    const responseBody = document.getElementById('responseBody');
    const allInputs = getAllInputElements();

    // Reset all states
    allInputs.forEach(i => i.classList.remove('input-error', 'input-valid'));
    responseSection.classList.remove('show');

    // Check API key first
    if (!apiKey) {
        showError([], true);
        return;
    }

    const ingredientValues = getAllIngredients();

    // Empty check
    if (ingredientValues.length === 0) {
        allInputs.forEach(i => i.classList.add('input-error'));
        showError(['No ingredients entered! Please fill at least one field.']);
        return;
    }

    const allIngredients = ingredientValues.join(', ');

    // ===== STEP 1: AI VALIDATION =====
    btn.classList.add('validating');
    btn.disabled = true;
    document.querySelector('.loading-text').textContent = '🛡️ Validating ingredients...';

    const validation = await validateIngredientsWithAI(allIngredients, apiKey);

    // Handle invalid API key
    if (validation.error === 'invalid_key') {
        btn.classList.remove('validating');
        btn.disabled = false;
        localStorage.removeItem(STORAGE_KEY);
        updateApiStatus(false);
        document.getElementById('apiKeyInput').value = '';
        document.getElementById('apiKeyInput').classList.remove('saved');
        showError([], true);
        showToast('API key is invalid or expired!', 'error', '❌');
        return;
    }

    // Handle invalid ingredients
    if (!validation.valid && validation.invalid_items && validation.invalid_items.length > 0) {
        btn.classList.remove('validating');
        btn.disabled = false;
        showError(validation.invalid_items);
        return;
    }

    // Mark all filled inputs as valid
    allInputs.forEach(i => {
        if (i.value.trim()) i.classList.add('input-valid');
    });

    // ===== STEP 2: GENERATE RECIPE =====
    btn.classList.remove('validating');
    btn.classList.add('loading');
    document.querySelector('.loading-text').textContent = '👨‍🍳 Cooking up a recipe...';

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    {
                        role: 'system',
                        content: `You are MK Master Chef 👨‍🍳, a world-class AI chef with incredible creativity.
Given ingredients, create ONE amazing, detailed recipe using as many of the provided ingredients as possible.

Format:
## 🍽️ [Creative Recipe Name]

**⏱️ Time:** [Prep + Cook time]
**🍴 Servings:** [Number]
**📊 Difficulty:** [Easy/Medium/Hard]

### 📝 Ingredients
- [Full list with exact quantities — include the user's ingredients plus any essentials]

### 👨‍🍳 Instructions
1. [Step by step, clear and detailed]

### 💡 Chef's Pro Tip
[One amazing tip]

### 🌟 Serving Suggestion
[How to plate and serve]

Be enthusiastic, precise, and creative! Use emojis sparingly.`
                    },
                    {
                        role: 'user',
                        content: `Create a delicious recipe using these ${ingredientValues.length} ingredients: ${allIngredients}`
                    }
                ],
                temperature: 0.8,
                max_tokens: 1500
            })
        });

        if (response.status === 401) {
            throw new Error('Invalid API key.');
        }

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const recipe = data.choices[0].message.content;

        responseBody.innerHTML = formatMarkdown(recipe);
        responseSection.classList.add('show');

        setTimeout(() => {
            responseSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 200);

        showToast('Recipe ready! Bon appétit! 🎉', 'success', '🍽️');

    } catch (error) {
        console.error('Error:', error);
        responseBody.innerHTML = `
            <div style="text-align:center;padding:20px;">
                <div style="font-size:48px;margin-bottom:15px;">😅</div>
                <p style="color:#fca5a5;font-weight:600;font-size:16px;">Kitchen Malfunction!</p>
                <p style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:8px;">
                    ${error.message || 'Could not reach the AI chef. Check your API key.'}
                </p>
            </div>
        `;
        responseSection.classList.add('show');
    } finally {
        btn.classList.remove('loading', 'validating');
        btn.disabled = false;
        document.querySelector('.loading-text').textContent = 'AI is thinking...';
    }
}

// ========================================
//  MARKDOWN FORMATTER
// ========================================
function formatMarkdown(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/^(\d+)\. (.*$)/gm, '<li><strong>$1.</strong> $2</li>')
        .replace(/((<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');
}

// ========================================
//  EVENT LISTENERS
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize API key
    initApiKey();
    updateIngredientCounter();

    // Ingredient input events
    getAllInputElements().forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') cookMagic();
        });

        input.addEventListener('input', () => {
            input.classList.remove('input-error', 'input-valid');
            updateIngredientCounter();
        });

        input.addEventListener('focus', () => {
            input.parentElement.style.transform = 'scale(1.02)';
        });

        input.addEventListener('blur', () => {
            input.parentElement.style.transform = 'scale(1)';
        });
    });

    // API key input enter key
    document.getElementById('apiKeyInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveApiKey();
    });

    // Close error overlay on background click
    document.getElementById('errorOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeError();
    });

    // Close error on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeError();
    });
});