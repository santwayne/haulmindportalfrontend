// Centralized icon exports for consistency across the application
export {
    // Navigation & Actions
    FaPlus,
    FaEdit,
    FaTrash,
    FaEye,
    FaEyeSlash,
    FaSearch,
    FaFilter,
    FaSyncAlt,
    FaDownload,
    FaUpload,
    FaPrint,
    FaShare,
    FaCopy,
    FaSave,
    FaTimes,
    FaCheck,
    FaArrowLeft,
    FaArrowRight,
    FaArrowUp,
    FaArrowDown,
    FaChevronLeft,
    FaChevronRight,
    FaChevronUp,
    FaChevronDown,
    FaEllipsisV,
    FaEllipsisH,
    
    // Status & Alerts
    FaCheckCircle,
    FaTimesCircle,
    FaExclamationTriangle,
    FaExclamationCircle,
    FaInfoCircle,
    FaBell,
    FaBellSlash,
    
    // Health & Safety Specific
    FaShieldAlt,
    FaUserShield,
    FaHardHat,
    FaFirstAid,
    FaMedkit,
    FaHeartbeat,
    FaUserInjured,
    FaAmbulance,
    
    // Documents & Files
    FaFile,
    FaFileAlt,
    FaFilePdf,
    FaFileWord,
    FaFileExcel,
    FaFileImage,
    FaFileArchive,
    FaFileContract,
    FaFileMedical,
    FaFolder,
    FaFolderOpen,
    
    // People & Teams
    FaUser,
    FaUsers,
    FaUsersCog,
    FaUserCheck,
    FaUserTie,
    FaUserTag,
    FaIdCard,
    FaIdBadge,
    
    // Communication
    FaComments,
    FaComment,
    FaEnvelope,
    FaEnvelopeOpen,
    FaPhone,
    FaPhoneAlt,
    FaFax,
    
    // Locations & Mapping
    FaMapMarkerAlt,
    FaMapMarked,
    FaWarehouse,
    FaIndustry,
    FaBuilding,
    FaHome,
    FaRoad,
    
    // Equipment & Tools
    FaTools,
    FaWrench,
    FaCog,
    FaCogs,
    FaHammer,
    FaScrewdriver,
    FaToolbox,
    
    // Vehicles & Transportation
    FaTruck,
    FaTruckLoading,
    FaTruckMoving,
    FaShippingFast,
    FaPallet,
    FaBoxes,
    FaBox,
    FaDolly,
    
    // Safety Equipment & Hazards
    FaFire,
    FaFireExtinguisher,
    FaRadiation,
    FaBiohazard,
    FaSkullCrossbones,
    FaHospital,
    
    // Weather & Environment
    FaSnowflake,
    FaCloudRain,
    FaSun,
    FaWind,
    FaThermometerHalf,
    
    // Time & Calendar
    FaCalendar,
    FaCalendarAlt,
    FaCalendarCheck,
    FaCalendarTimes,
    FaCalendarDay,
    FaClock,
    FaHistory,
    FaHourglass,
    FaStopwatch,
    
    // Tasks & Checklists
    FaClipboard,
    FaClipboardList,
    FaClipboardCheck,
    FaTasks,
    FaListAlt,
    FaListUl,
    FaListOl,
    
    // Training & Education
    FaGraduationCap,
    FaBook,
    FaBookOpen,
    FaBookReader,
    FaCertificate,
    FaAward,
    FaMedal,
    FaTrophy,
    
    // Analytics & Reports
    FaChartLine,
    FaChartBar,
    FaChartPie,
    FaChartArea,
   
    
    // Settings & Configuration
    FaCog as FaSettings,
    FaSlidersH,
    FaAdjust,
    
    // Miscellaneous
    FaLock,
    FaUnlock,
    FaKey,
    FaTag,
    FaTags,
    FaFlag,
    FaStar,
    FaHeart,
    FaThumbsUp,
    FaThumbsDown,
    FaQuestionCircle,
    FaLifeRing,
    FaBullhorn,
   
    FaLightbulb,
    FaBolt,
    FaRecycle,
    FaLeaf,
    FaTree,
    FaWater,
    FaGasPump,
    FaBatteryFull,
    FaPlug,
    FaWifi,
    FaSignal,
    FaDatabase,
    FaServer,
    FaCloud,
    FaCloudUploadAlt,
    FaCloudDownloadAlt,
    FaImage,
    FaImages,
    FaVideo,
    FaCamera,
    FaMicrophone,
    FaVolumeUp,
    FaVolumeOff,
    FaExpand,
    FaCompress,
    FaLink,
    FaExternalLinkAlt,
    FaHashtag,
    FaAt,
    FaDollarSign,
    FaPercent,
    FaCalculator,
    FaQrcode,
    FaBarcode,
    FaPaperclip,
    FaPaperPlane,
    FaRandom,
    FaRedoAlt,
    FaUndoAlt,
  } from 'react-icons/fa';
  
  // Type exports for icon props
  import type { IconType } from 'react-icons';
  export type { IconType };
  
  // Icon size presets
  export const ICON_SIZES = {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
    '2xl': 40,
    '3xl': 48,
  } as const;
  
  // Common icon components with consistent styling
  export const getIconStyle = (size: keyof typeof ICON_SIZES = 'md') => ({
    width: ICON_SIZES[size],
    height: ICON_SIZES[size],
  });