"use client";

import Image from "next/image";
import {
  Dashboard,
  LocalDrink,
  Restaurant,
  RestaurantMenu,
  SoupKitchen,
  AssignmentInd,
  Accessible,
  Elderly,
  Groups,
  SportsScore,
  HealthAndSafety,
  People,
  Settings,
  Logout,
  Person,
  Home,
  Search,
  Assessment,
  Storage,
  PersonAdd,
  AdminPanelSettings,
  Work,
  School,
  Business,
  Task,
  Schedule,
  Event,
  Assignment,
  Map,
  Public,
  LocationOn,
  Security,
  FolderShared,
  HourglassEmpty,
  Gavel,
  BeachAccess,
  Weekend,
  BrowseGallery,
  Wc,
  List,
  Place,
  Layers,
  MyLocation,
  FreeBreakfast,
  SpaceDashboard,
  Diversity1,
  PinDrop,
  ChildCare,
  FamilyRestroom,
  GridView,
  Explore,
  WhatsApp,
  Masks,
} from "@mui/icons-material";

interface DynamicIconProps {
  iconName?: string;
  className?: string;
}

// Mapa de imágenes personalizadas para íconos
const imageIconMap: Record<string, string> = {
  "img:pvl": "/vaca.jpg",
};

const iconMap: Record<string, React.ReactNode> = {
  Dashboard: <Dashboard />,
  LocalDrink: <LocalDrink />,
  Restaurant: <Restaurant />,
  RestaurantMenu: <RestaurantMenu />,
  SoupKitchen: <SoupKitchen />,
  AssignmentInd: <AssignmentInd />,
  Accessible: <Accessible />,
  Elderly: <Elderly />,
  Groups: <Groups />,
  SportsScore: <SportsScore />,
  HealthAndSafety: <HealthAndSafety />,
  People: <People />,
  Settings: <Settings />,
  Logout: <Logout />,
  Person: <Person />,
  Home: <Home />,
  Search: <Search />,
  Assessment: <Assessment />,
  Storage: <Storage />,
  PersonAdd: <PersonAdd />,
  AdminPanelSettings: <AdminPanelSettings />,
  Work: <Work />,
  School: <School />,
  Business: <Business />,
  Task: <Task />,
  Schedule: <Schedule />,
  Event: <Event />,
  Assignment: <Assignment />,
  Map: <Map />,
  Public: <Public />,
  LocationOn: <LocationOn />,
  Security: <Security />,
  FolderShared: <FolderShared />,
  HourglassEmpty: <HourglassEmpty />,
  Gavel: <Gavel />,
  BeachAccess: <BeachAccess />,
  Weekend: <Weekend />,
  BrowseGallery: <BrowseGallery />,
  Wc: <Wc />,
  List: <List />,
  Place: <Place />,
  Layers: <Layers />,
  MyLocation: <MyLocation />,
  FreeBreakfast: <FreeBreakfast />,
  SpaceDashboard: <SpaceDashboard />,
  Diversity1: <Diversity1 />,
  PinDrop: <PinDrop />,
  ChildCare: <ChildCare />,
  FamilyRestroom: <FamilyRestroom />,
  GridView: <GridView />,
  Explore: <Explore />,
  WhatsApp: <WhatsApp />,
  Masks: <Masks />,
};

export default function DynamicIcon({ iconName, className }: DynamicIconProps) {
  if (!iconName) return null;

  // Si el ícono es una imagen personalizada (empieza con "img:")
  if (iconName.startsWith("img:")) {
    const imageSrc = imageIconMap[iconName];
    if (imageSrc) {
      return (
        <span className={className} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Image
            src={imageSrc}
            alt={iconName.replace("img:", "")}
            width={24}
            height={24}
            style={{ borderRadius: "4px", objectFit: "cover" }}
          />
        </span>
      );
    }
  }

  return <span className={className}>{iconMap[iconName] || <Dashboard />}</span>;
}
