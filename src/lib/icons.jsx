import {
  Baby,
  Banknote,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Car,
  CircleDollarSign,
  Coins,
  CreditCard,
  Dumbbell,
  Gamepad2,
  Gem,
  Gift,
  Globe,
  Heart,
  House,
  Landmark,
  Laptop,
  Music,
  PawPrint,
  PiggyBank,
  Pill,
  Plane,
  Rocket,
  Shield,
  ShoppingCart,
  Sparkles,
  Tag,
  Target,
  Trophy,
  Utensils,
  Volleyball,
  Wallet,
} from 'lucide-react';

const ICON_REGISTRY = {
  wallet: Wallet,
  bank: Landmark,
  card: CreditCard,
  mobile: CircleDollarSign,
  cash: Banknote,
  coins: Coins,
  banknote: Banknote,
  gem: Gem,
  trophy: Trophy,
  target: Target,
  rocket: Rocket,
  sparkles: Sparkles,
  briefcase: BriefcaseBusiness,
  cart: ShoppingCart,
  home: House,
  car: Car,
  plane: Plane,
  utensils: Utensils,
  gamepad: Gamepad2,
  book: BookOpen,
  music: Music,
  dumbbell: Dumbbell,
  heart: Heart,
  'piggy-bank': PiggyBank,
  shield: Shield,
  chart: BarChart3,
  gift: Gift,
  sport: Volleyball,
  pet: PawPrint,
  baby: Baby,
  globe: Globe,
  laptop: Laptop,
  pill: Pill,
  tag: Tag,
};

const LEGACY_ALIASES = {
  savings: 'piggy-bank',
  salary: 'briefcase',
  shopping: 'cart',
  travel: 'plane',
  food: 'utensils',
  fun: 'gamepad',
  health: 'pill',
  emergency: 'shield',
  wallet: 'wallet',
  chart: 'chart',
  home: 'home',
  car: 'car',
  plane: 'plane',
  laptop: 'laptop',
  book: 'book',
  gift: 'gift',
  music: 'music',
  sport: 'sport',
  pet: 'pet',
  baby: 'baby',
};

const EMOJI_ALIASES = {
  '💰': 'wallet',
  '👛': 'wallet',
  '🏦': 'bank',
  '💳': 'card',
  '📱': 'mobile',
  '💸': 'cash',
  '🤑': 'coins',
  '💵': 'banknote',
  '💎': 'gem',
  '🏆': 'trophy',
  '🎯': 'target',
  '🚀': 'rocket',
  '🌟': 'sparkles',
  '💼': 'briefcase',
  '🛒': 'cart',
  '🏠': 'home',
  '🚗': 'car',
  '✈️': 'plane',
  '🍔': 'utensils',
  '🎮': 'gamepad',
  '📚': 'book',
  '🎵': 'music',
  '🏃': 'dumbbell',
  '💪': 'dumbbell',
  '❤️': 'heart',
  '🐷': 'piggy-bank',
  '🛡️': 'shield',
  '📊': 'chart',
  '🎁': 'gift',
  '⚽': 'sport',
  '🐾': 'pet',
  '🍼': 'baby',
  '🌍': 'globe',
  '💊': 'pill',
  '💻': 'laptop',
  '🏷️': 'tag',
};

export const WALLET_ICON_OPTIONS = [
  { key: 'wallet', label: 'Billetera' },
  { key: 'bank', label: 'Banco' },
  { key: 'card', label: 'Tarjeta' },
  { key: 'mobile', label: 'Móvil' },
  { key: 'cash', label: 'Efectivo' },
  { key: 'coins', label: 'Monedas' },
  { key: 'gem', label: 'Meta' },
  { key: 'briefcase', label: 'Trabajo' },
  { key: 'home', label: 'Casa' },
  { key: 'car', label: 'Auto' },
  { key: 'plane', label: 'Viaje' },
  { key: 'heart', label: 'Salud' },
];

export const BUDGET_ICON_OPTIONS = [
  { key: 'piggy-bank', label: 'Ahorro' },
  { key: 'briefcase', label: 'Salario' },
  { key: 'home', label: 'Hogar' },
  { key: 'utensils', label: 'Comida' },
  { key: 'car', label: 'Transporte' },
  { key: 'pill', label: 'Salud' },
  { key: 'shield', label: 'Emergencia' },
  { key: 'cart', label: 'Compras' },
  { key: 'gamepad', label: 'Ocio' },
  { key: 'chart', label: 'Inversión' },
  { key: 'gift', label: 'Regalos' },
  { key: 'plane', label: 'Viajes' },
  { key: 'laptop', label: 'Estudio / Tech' },
];

export function normalizeIconKey(value, fallback = 'wallet') {
  if (!value) return fallback;

  const raw = String(value).trim();
  const lowered = raw.toLowerCase();

  if (ICON_REGISTRY[lowered]) return lowered;
  if (LEGACY_ALIASES[lowered] && ICON_REGISTRY[LEGACY_ALIASES[lowered]]) return LEGACY_ALIASES[lowered];
  if (EMOJI_ALIASES[raw] && ICON_REGISTRY[EMOJI_ALIASES[raw]]) return EMOJI_ALIASES[raw];

  return fallback;
}

export function getIconComponent(value, fallback = 'wallet') {
  const key = normalizeIconKey(value, fallback);
  return ICON_REGISTRY[key] || ICON_REGISTRY[fallback] || Wallet;
}

export function IconGlyph({ value, fallback = 'wallet', className = 'h-4 w-4', strokeWidth = 1.9 }) {
  const Icon = getIconComponent(value, fallback);
  return <Icon className={className} strokeWidth={strokeWidth} />;
}
