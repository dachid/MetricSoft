/**
 * Centralized text styling utilities to ensure consistent text colors
 * across the entire application
 */

export const textStyles = {
  // Primary text colors
  heading: 'text-gray-900',
  body: 'text-gray-800', 
  muted: 'text-gray-600',
  subtle: 'text-gray-500',
  placeholder: 'text-gray-400',
  
  // Interactive text colors
  link: 'text-blue-600 hover:text-blue-700',
  linkDanger: 'text-red-600 hover:text-red-700',
  linkSuccess: 'text-green-600 hover:text-green-700',
  
  // Button text colors (to be used with button backgrounds)
  buttonPrimary: 'text-white',
  buttonSecondary: 'text-gray-900',
  buttonDanger: 'text-white',
  buttonSuccess: 'text-white',
  buttonOutline: 'text-gray-700 hover:text-gray-900',
  
  // Status text colors
  success: 'text-green-800',
  warning: 'text-yellow-800',
  error: 'text-red-800',
  info: 'text-blue-800',
  
  // Special contexts
  onDark: 'text-white',
  onLight: 'text-gray-900',
  contrast: 'text-gray-900', // High contrast for accessibility
};

export const useTextStyles = () => {
  return {
    ...textStyles,
    
    // Helper function to get text class based on context
    getText: (variant: keyof typeof textStyles) => textStyles[variant],
    
    // Helper to combine text style with other classes
    combine: (textVariant: keyof typeof textStyles, ...otherClasses: string[]) => {
      return `${textStyles[textVariant]} ${otherClasses.join(' ')}`.trim();
    }
  };
};

// Default classes for common components
export const defaultComponentClasses = {
  card: 'bg-white border border-gray-200 rounded-lg text-gray-900',
  input: 'bg-white border border-gray-300 rounded-md text-gray-900 placeholder:text-gray-400',
  button: 'font-medium text-gray-900',
  buttonPrimary: 'bg-blue-600 text-white hover:bg-blue-700 font-medium',
  buttonSecondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 font-medium',
  buttonDanger: 'bg-red-600 text-white hover:bg-red-700 font-medium',
  label: 'text-gray-700 font-medium',
  heading1: 'text-2xl font-bold text-gray-900',
  heading2: 'text-xl font-semibold text-gray-900',
  heading3: 'text-lg font-medium text-gray-900',
  heading4: 'text-base font-medium text-gray-900',
};
