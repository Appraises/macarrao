"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcrypt = __importStar(require("bcryptjs"));
var prisma = new client_1.PrismaClient();
var GAMES = [
    { id: '1', name: 'League of Legends', slug: 'lol', genre: 'MOBA', image: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_0.jpg' },
    { id: '2', name: 'Valorant', slug: 'valorant', genre: 'FPS', image: 'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blt3f072536d5a3e166/6201d629e00b43671c32f755/Jett_Key_Art_Valorant.jpg' },
    { id: '3', name: 'Counter-Strike 2', slug: 'cs2', genre: 'FPS', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg' },
    { id: '4', name: 'World of Warcraft', slug: 'wow', genre: 'MMORPG', image: 'https://bnetcmsus-a.akamaihd.net/cms/blog_header/2g/2G4VNH5J968S1573515620442.jpg' },
    { id: '5', name: 'Elden Ring', slug: 'eldenring', genre: 'RPG', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg' },
    { id: '6', name: 'Street Fighter 6', slug: 'sf6', genre: 'Fighting', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1364780/header.jpg' },
    { id: '7', name: 'Overwatch 2', slug: 'overwatch', genre: 'FPS', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2357570/header.jpg' },
    { id: '8', name: 'Rocket League', slug: 'rocket-league', genre: 'Sports', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/252950/header.jpg' },
    { id: '9', name: 'Minecraft', slug: 'minecraft', genre: 'Sandbox', image: 'https://image.api.playstation.com/vulcan/img/rnd/202010/2119/9f7e4f9b0c5d4f3b8b8b0e8b8b8b8b8b.png' },
    { id: '10', name: 'Fortnite', slug: 'fortnite', genre: 'Battle Royale', image: 'https://cdn2.unrealengine.com/fortnite-chapter-5-season-2-1920x1080-602079089.jpg' },
    { id: '11', name: 'Dota 2', slug: 'dota2', genre: 'MOBA', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg' },
    { id: '12', name: 'Call of Duty: Warzone', slug: 'warzone', genre: 'Battle Royale', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1962663/header.jpg' },
];
var TERMS = [
    {
        word: 'Gank',
        definition: 'Ato de emboscar um inimigo, geralmente aparecendo de surpresa em sua rota para criar vantagem numérica.',
        phonetic: '/ɡæŋk/',
        pronunciationGuide: 'Guen-k',
        examples: JSON.stringify(['O jungler veio dar um gank no top.', 'Cuidado com o gank, o mid sumiu.']),
        gameId: '1',
        upvotes: 1250,
        downvotes: 12,
        tags: 'Estratégia,MOBA,General',
        verified: true
    },
    {
        word: 'Nerf',
        definition: 'Enfraquecimento de um personagem, item ou habilidade pelos desenvolvedores para balancear o jogo.',
        phonetic: '/nɜːrf/',
        pronunciationGuide: 'Nêrf',
        examples: JSON.stringify(['A Jett tomou um nerf pesado no último patch.', 'Precisam nerfar essa arma, está muito forte.']),
        gameId: null,
        upvotes: 890,
        downvotes: 5,
        tags: 'Balanceamento,Geral,General',
        verified: true
    },
    {
        word: 'Spike',
        definition: 'O dispositivo explosivo que os atacantes devem plantar em um dos sites (A, B ou C). Equivalente à bomba (C4) do CS.',
        phonetic: '/spaɪk/',
        pronunciationGuide: 'Spai-que',
        examples: JSON.stringify(['A Spike está caída no meio.', 'Planta a Spike logo!']),
        gameId: '2',
        upvotes: 1100,
        downvotes: 25,
        tags: 'Objetivo,FPS',
        verified: true
    },
    {
        word: 'Eco Round',
        definition: 'Rodada em que o time compra pouco ou nenhum equipamento para economizar dinheiro para o próximo round.',
        phonetic: '/ˈiː.koʊ/',
        pronunciationGuide: 'É-co',
        examples: JSON.stringify(['Estamos sem grana, vamos fazer um eco.', 'Eles ganharam o eco round apenas com pistolas.']),
        gameId: '3',
        upvotes: 1500,
        downvotes: 5,
        tags: 'Economia,FPS',
        verified: true
    }
];
var NEWS = [
    { headline: 'FalleN confirma aposentadoria após Major do Rio', category: 'CS2', image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=400&auto=format&fit=crop', author: 'Dust2' },
    { headline: 'Arcane Season 2 quebra recordes de audiência na Twitch', category: 'LoL', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=400&auto=format&fit=crop', author: 'Riot' },
    { headline: 'Novo agente do Valorant "Smoke" é revelado com habilidades de teleporte', category: 'Valorant', image: 'https://images.unsplash.com/photo-1624138784181-dc7f5b75e52e?q=80&w=400&auto=format&fit=crop', author: 'ValorantZone' }
];
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var password, _i, GAMES_1, game, _a, TERMS_1, term, _b, NEWS_1, news;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, bcrypt.hash('admin', 10)];
                case 1:
                    password = _c.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: 'admin@dicionariogamer.com' },
                            update: {},
                            create: {
                                name: 'Admin',
                                email: 'admin@dicionariogamer.com',
                                password: password,
                                role: 'ADMIN',
                                level: 99,
                                avatar: 'https://github.com/shadcn.png'
                            },
                        })];
                case 2:
                    _c.sent();
                    _i = 0, GAMES_1 = GAMES;
                    _c.label = 3;
                case 3:
                    if (!(_i < GAMES_1.length)) return [3 /*break*/, 6];
                    game = GAMES_1[_i];
                    return [4 /*yield*/, prisma.game.upsert({
                            where: { slug: game.slug },
                            update: {},
                            create: game,
                        })];
                case 4:
                    _c.sent();
                    _c.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6:
                    _a = 0, TERMS_1 = TERMS;
                    _c.label = 7;
                case 7:
                    if (!(_a < TERMS_1.length)) return [3 /*break*/, 10];
                    term = TERMS_1[_a];
                    return [4 /*yield*/, prisma.term.create({
                            data: term,
                        })];
                case 8:
                    _c.sent();
                    _c.label = 9;
                case 9:
                    _a++;
                    return [3 /*break*/, 7];
                case 10:
                    _b = 0, NEWS_1 = NEWS;
                    _c.label = 11;
                case 11:
                    if (!(_b < NEWS_1.length)) return [3 /*break*/, 14];
                    news = NEWS_1[_b];
                    return [4 /*yield*/, prisma.news.create({
                            data: news,
                        })];
                case 12:
                    _c.sent();
                    _c.label = 13;
                case 13:
                    _b++;
                    return [3 /*break*/, 11];
                case 14:
                    console.log('Seed completed!');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
