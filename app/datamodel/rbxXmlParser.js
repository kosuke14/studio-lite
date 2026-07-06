import brickColors from './brickColorMap.js';

function getTagText(el, tag) {
    const child = el.getElementsByTagName(tag)[0];
    return child ? child.textContent.trim() : "";
}

function getTagFloat(el, tag, fallback = 0) {
    const text = getTagText(el, tag);
    if (text === "INF") return Infinity;
    if (text === "-INF") return -Infinity;
    if (text === "NAN" || text === "NaN") return NaN;
    const v = parseFloat(text);
    return isNaN(v) ? fallback : v;
}

function getTagInt(el, tag, fallback = 0) {
    const text = getTagText(el, tag);
    const v = parseInt(text, 10);
    return isNaN(v) ? fallback : v;
}

function parseVector3(el) {
    return {
        X: getTagFloat(el, "X"),
        Y: getTagFloat(el, "Y"),
        Z: getTagFloat(el, "Z")
    };
}

function parseVector2(el) {
    return {
        X: getTagFloat(el, "X"),
        Y: getTagFloat(el, "Y")
    };
}

// Produces the same Components layout as the binary parser:
// [X, Y, Z, R00, R10, R20, R01, R11, R21, R02, R12, R22]
function parseCFrame(el) {
    const x = getTagFloat(el, "X");
    const y = getTagFloat(el, "Y");
    const z = getTagFloat(el, "Z");
    const r00 = getTagFloat(el, "R00");
    const r01 = getTagFloat(el, "R01");
    const r02 = getTagFloat(el, "R02");
    const r10 = getTagFloat(el, "R10");
    const r11 = getTagFloat(el, "R11");
    const r12 = getTagFloat(el, "R12");
    const r20 = getTagFloat(el, "R20");
    const r21 = getTagFloat(el, "R21");
    const r22 = getTagFloat(el, "R22");
    return {
        Position: { X: x, Y: y, Z: z },
        Components: [x, y, z, r00, r10, r20, r01, r11, r21, r02, r12, r22]
    };
}

function parseColor3(el) {
    // Two forms: <R>,<G>,<B> child tags, or packed uint32 text content
    const rTag = el.getElementsByTagName("R")[0];
    if (rTag) {
        return {
            R: getTagFloat(el, "R"),
            G: getTagFloat(el, "G"),
            B: getTagFloat(el, "B")
        };
    }
    // Packed uint32: (b) + (g << 8) + (r << 16)
    const packed = parseInt(el.textContent.trim(), 10);
    if (!isNaN(packed)) {
        return {
            R: ((packed >> 16) & 0xFF) / 255,
            G: ((packed >> 8) & 0xFF) / 255,
            B: (packed & 0xFF) / 255
        };
    }
    return { R: 0, G: 0, B: 0 };
}

function parseColor3uint8(el) {
    const packed = parseInt(el.textContent.trim(), 10);
    if (!isNaN(packed)) {
        return {
            R: ((packed >> 16) & 0xFF) / 255,
            G: ((packed >> 8) & 0xFF) / 255,
            B: (packed & 0xFF) / 255
        };
    }
    return { R: 0, G: 0, B: 0 };
}

function parseContent(el) {
    const url = el.getElementsByTagName("url")[0];
    if (url) return url.textContent.trim();
    const uri = el.getElementsByTagName("uri")[0];
    if (uri) return uri.textContent.trim();
    return "";
}

function parseBrickColor(el) {
    const id = getTagInt(el, "int", -1);
    // In XML, BrickColor is serialized as <int name="BrickColor">194</int>
    // But it could also appear as a direct int value
    const text = el.textContent.trim();
    const num = parseInt(text, 10);
    if (!isNaN(num)) {
        const def = brickColors[num];
        if (def && typeof def === "object") {
            return def;
        }
        return { Name: "Medium stone grey", Color: { R: 163, G: 162, B: 165 } };
    }
    return { Name: "Medium stone grey", Color: { R: 163, G: 162, B: 165 } };
}

function parseUDim(el) {
    return {
        Scale: getTagFloat(el, "S"),
        Offset: getTagInt(el, "O")
    };
}

function parseUDim2(el) {
    return {
        X: { Scale: getTagFloat(el, "XS"), Offset: getTagInt(el, "XO") },
        Y: { Scale: getTagFloat(el, "YS"), Offset: getTagInt(el, "YO") }
    };
}

function parseFaces(el) {
    return getTagInt(el, "value", 0);
}

function parseAxes(el) {
    return getTagInt(el, "value", 0);
}

function parseRay(el) {
    const origin = el.getElementsByTagName("Origin")[0];
    const direction = el.getElementsByTagName("Direction")[0];
    return {
        Origin: origin ? parseVector3(origin) : { X: 0, Y: 0, Z: 0 },
        Direction: direction ? parseVector3(direction) : { X: 0, Y: 0, Z: 1 }
    };
}

function parseRect(el) {
    const min = el.getElementsByTagName("Min")[0];
    const max = el.getElementsByTagName("Max")[0];
    return {
        Min: min ? parseVector2(min) : { X: 0, Y: 0 },
        Max: max ? parseVector2(max) : { X: 0, Y: 0 }
    };
}

function parseNumberRange(el) {
    // Format: "2.5 2.9" (space-separated)
    const text = el.textContent.trim();
    const parts = text.split(/\s+/);
    const min = parseFloat(parts[0]) || 0;
    const max = parts.length > 1 ? (parseFloat(parts[1]) || 0) : min;
    return { Min: min, Max: max };
}

function parsePhysicalProperties(el) {
    const density = getTagFloat(el, "Density");
    const friction = getTagFloat(el, "Friction");
    const elasticity = getTagFloat(el, "Elasticity");
    const frictionWeight = getTagFloat(el, "FrictionWeight");
    const elasticityWeight = getTagFloat(el, "ElasticityWeight");
    return { Density: density, Friction: friction, Elasticity: elasticity, FrictionWeight: frictionWeight, ElasticityWeight: elasticityWeight };
}

function parseNumberSequence(el) {
    // Two formats:
    // 1) <Keypoint time="0" value="0.5" envelope="0"/> children
    // 2) "0 0.5 0 0.5 0.5 0" space-separated text (Time Value Envelope triplets)
    const kpEls = el.children;
    if (kpEls.length > 0) {
        const keypoints = [];
        for (let i = 0; i < kpEls.length; i++) {
            const kp = kpEls[i];
            if (kp.tagName === "Keypoint") {
                keypoints.push({
                    Time: parseFloat(kp.getAttribute("time")) || 0,
                    Value: parseFloat(kp.getAttribute("value")) || 0,
                    Envelope: parseFloat(kp.getAttribute("envelope")) || 0
                });
            }
        }
        return { Keypoints: keypoints };
    }
    // Space-separated: "time value envelope time value envelope ..."
    const text = el.textContent.trim();
    const nums = text.split(/\s+/).map(Number);
    const keypoints = [];
    for (let i = 0; i + 2 < nums.length; i += 3) {
        keypoints.push({
            Time: nums[i] || 0,
            Value: nums[i + 1] || 0,
            Envelope: nums[i + 2] || 0
        });
    }
    return { Keypoints: keypoints };
}

function parseColorSequence(el) {
    // Two formats:
    // 1) <Keypoint time="0" r="1" g="0" b="0" envelope="0"/> children
    // 2) "0 1 0 0 1 0 0 1 0 0.5 0 1 0 0.5 0" space-separated (Time R G B Envelope triplets)
    const kpEls = el.children;
    if (kpEls.length > 0) {
        const keypoints = [];
        for (let i = 0; i < kpEls.length; i++) {
            const kp = kpEls[i];
            if (kp.tagName === "Keypoint") {
                const r = parseFloat(kp.getAttribute("r")) || 0;
                const g = parseFloat(kp.getAttribute("g")) || 0;
                const b = parseFloat(kp.getAttribute("b")) || 0;
                keypoints.push({
                    Time: parseFloat(kp.getAttribute("time")) || 0,
                    Color: { R: r, G: g, B: b },
                    Envelope: parseFloat(kp.getAttribute("envelope")) || 0
                });
            }
        }
        return { Keypoints: keypoints };
    }
    // Space-separated: "time r g b envelope time r g b envelope ..."
    const text = el.textContent.trim();
    const nums = text.split(/\s+/).map(Number);
    const keypoints = [];
    for (let i = 0; i + 4 < nums.length; i += 5) {
        keypoints.push({
            Time: nums[i] || 0,
            Color: { R: nums[i+1] || 0, G: nums[i+2] || 0, B: nums[i+3] || 0 },
            Envelope: nums[i+4] || 0
        });
    }
    return { Keypoints: keypoints };
}

// The list of XML tag names that correspond to Roblox value types
// and their parse functions.
const valueParsers = {
    "string": (el) => el.textContent,
    "ProtectedString": (el) => el.textContent,
    "BinaryString": (el) => el.textContent,
    "SharedString": (el) => el.textContent,
    "bool": (el) => el.textContent.trim() === "true",
    "int": (el) => parseInt(el.textContent.trim(), 10) || 0,
    "int64": (el) => parseInt(el.textContent.trim(), 10) || 0,
    "float": (el) => {
        const t = el.textContent.trim();
        if (t === "INF") return Infinity;
        if (t === "-INF") return -Infinity;
        if (t === "NAN" || t === "NaN") return NaN;
        return parseFloat(t) || 0;
    },
    "double": (el) => {
        const t = el.textContent.trim();
        if (t === "INF") return Infinity;
        if (t === "-INF") return -Infinity;
        if (t === "NAN" || t === "NaN") return NaN;
        return parseFloat(t) || 0;
    },
    "Vector3": (el) => parseVector3(el),
    "Vector2": (el) => parseVector2(el),
    "Vector3int16": (el) => parseVector3(el),
    "Vector2int16": (el) => parseVector2(el),
    "CoordinateFrame": (el) => parseCFrame(el),
    "CFrame": (el) => parseCFrame(el),
    "Color3": (el) => parseColor3(el),
    "Color3uint8": (el) => parseColor3uint8(el),
    "Content": (el) => parseContent(el),
    "ContentId": (el) => parseContent(el),
    "Enum": (el) => parseInt(el.textContent.trim(), 10) || 0,
    "token": (el) => parseInt(el.textContent.trim(), 10) || 0,
    "BrickColor": (el) => parseBrickColor(el),
    "UDim": (el) => parseUDim(el),
    "UDim2": (el) => parseUDim2(el),
    "Faces": (el) => parseFaces(el),
    "Axes": (el) => parseAxes(el),
    "Ray": (el) => parseRay(el),
    "Rect": (el) => parseRect(el),
    "NumberRange": (el) => parseNumberRange(el),
    "PhysicalProperties": (el) => parsePhysicalProperties(el),
    "NumberSequence": (el) => parseNumberSequence(el),
    "NumberSequenceKeypoint": (el) => ({
        Time: parseFloat(el.getAttribute("time")) || 0,
        Value: parseFloat(el.getAttribute("value")) || 0,
        Envelope: parseFloat(el.getAttribute("envelope")) || 0
    }),
    "ColorSequence": (el) => parseColorSequence(el),
    "ColorSequenceKeypoint": (el) => ({
        Time: parseFloat(el.getAttribute("time")) || 0,
        Color: {
            R: parseFloat(el.getAttribute("r")) || 0,
            G: parseFloat(el.getAttribute("g")) || 0,
            B: parseFloat(el.getAttribute("b")) || 0
        },
        Envelope: parseFloat(el.getAttribute("envelope")) || 0
    }),
    "Ref": (el) => el.textContent.trim(),
    "Region3": (el) => el.textContent,
    "Region3int16": (el) => el.textContent,
    "UniqueId": (el) => el.textContent,
    "SecurityCapabilities": (el) => parseInt(el.textContent.trim(), 10) || 0,
    "Font": (el) => el.textContent,
};

function parseProperties(propsEl) {
    const props = {};
    const children = propsEl.children;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const propName = child.getAttribute("name");
        if (!propName) continue;

        const tagName = child.tagName;
        const parser = valueParsers[tagName];
        if (parser) {
            props[propName] = parser(child);
        } else {
            // Unknown type: store as string
            props[propName] = child.textContent.trim();
        }
    }

    // Normalize property names: Roblox XML sometimes uses lowercase names
    // that the renderer expects in PascalCase.
    if (props.size && !props.Size) props.Size = props.size;
    if (props.shape && !props.Shape) props.Shape = props.shape;
    if (props.offset && !props.Offset) props.Offset = props.offset;
    if (props.scale && !props.Scale) props.Scale = props.scale;

    // Map token enum values to string names for properties the renderer checks.
    // Shape: 1=Block, 2=Ball, 3=Cylinder
    const shapeNames = { 1: "Block", 2: "Ball", 3: "Cylinder" };
    if (typeof props.Shape === "number") {
        props.Shape = shapeNames[props.Shape] || "Block";
    }

    // Color3uint8 in XML serves the same role as Color3.
    // The renderer reads part.Color3, so map it.
    if (props.Color3uint8 && !props.Color3) {
        props.Color3 = props.Color3uint8;
    }

    // BrickColor in XML is <int name="BrickColor">194</int>, but the
    // renderer expects {Name, Color: {R, G, B}}. Convert if needed.
    if (typeof props.BrickColor === "number") {
        const id = props.BrickColor;
        const def = brickColors[id];
        if (def && typeof def === "object") {
            props.BrickColor = def;
        } else {
            props.BrickColor = { Name: "Medium stone grey", Color: { R: 163, G: 162, B: 165 } };
        }
    }

    return props;
}

function parseItem(itemEl) {
    const className = itemEl.getAttribute("class");
    if (!className) return null;

    const instance = {
        ClassName: className,
        Children: []
    };

    const children = itemEl.children;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.tagName === "Properties") {
            const props = parseProperties(child);
            for (const key of Object.keys(props)) {
                instance[key] = props[key];
            }
        } else if (child.tagName === "Item") {
            const childInstance = parseItem(child);
            if (childInstance) {
                instance.Children.push(childInstance);
            }
        }
        // Skip Meta, SharedStrings, etc. at this level
    }

    return instance;
}

/**
 * Parse an RBXLX/RBXMX XML file from an ArrayBuffer.
 * Returns an array of root instances, same format as the binary parser's decode().
 */
export function parseRbxXml(ab) {
    const decoder = new TextDecoder("utf-8");
    const xmlString = decoder.decode(ab);

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "text/xml");

    const parseError = doc.querySelector("parsererror");
    if (parseError) {
        throw new Error("XML parse error: " + parseError.textContent);
    }

    const roblox = doc.getElementsByTagName("roblox")[0];
    if (!roblox) {
        throw new Error("Not a valid Roblox XML file: missing <roblox> root element");
    }

    const roots = [];
    const children = roblox.children;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.tagName === "Item") {
            const instance = parseItem(child);
            if (instance) {
                roots.push(instance);
            }
        }
    }

    return roots;
}
