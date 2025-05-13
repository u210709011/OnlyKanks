import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES, Category, SubCategory } from '../../services/categories.service';
import { useTheme } from '../../context/theme.context';

interface CategoryFilterProps {
  selectedCategory?: string;
  selectedSubCategories: string[];
  onSelectCategory: (categoryId: string | undefined) => void;
  onSelectSubCategory: (subCategoryId: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  selectedSubCategories,
  onSelectCategory,
  onSelectSubCategory
}) => {
  const { theme } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const categoryRefs = useRef<{ [key: string]: { y: number, height: number } }>({});
  const [expandedCategory, setExpandedCategory] = useState<string | undefined>(selectedCategory);
  
  // Update expanded category when selectedCategory changes
  useEffect(() => {
    setExpandedCategory(selectedCategory);
  }, [selectedCategory]);
  
  const handleCategoryPress = (category: Category) => {
    console.log('Category pressed:', { 
      pressed: category.id, 
      currentExpanded: expandedCategory,
      willToggle: expandedCategory === category.id
    });
    
    if (expandedCategory === category.id) {
      // Collapse the category
      setExpandedCategory(undefined);
    } else {
      // Expand the category
      setExpandedCategory(category.id);
      
      // Allow UI to update before scrolling
      setTimeout(() => {
        if (categoryRefs.current[category.id]) {
          const { y, height } = categoryRefs.current[category.id];
          scrollViewRef.current?.scrollTo({
            y: y - 20, // Scroll a bit above the category
            animated: true
          });
        }
      }, 100);
    }
  };
  
  const toggleSubCategory = (subCategoryId: string) => {
    onSelectSubCategory(subCategoryId);
  };
  
  const isSubCategorySelected = (subCategoryId: string) => {
    return selectedSubCategories.includes(subCategoryId);
  };
  
  const onCategoryLayout = (categoryId: string, event: any) => {
    const { y, height } = event.nativeEvent.layout;
    categoryRefs.current[categoryId] = { y, height };
  };

  // Add "Other" subcategory to each category's subcategories
  const getSubCategoriesWithOther = (category: Category) => {
    return [
      ...category.subCategories,
      { id: `${category.id}-other`, name: 'Other' }
    ];
  };
  
  return (
    <View style={styles.container}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.categoriesList}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled={true}
      >
        {CATEGORIES.map((category) => (
          <View 
            key={category.id}
            onLayout={(e) => onCategoryLayout(category.id, e)}
          >
            <TouchableOpacity
              style={[
                styles.categoryItem,
                expandedCategory === category.id && { backgroundColor: theme.primary + '20' }
              ]}
              onPress={() => handleCategoryPress(category)}
            >
              <View style={styles.categoryHeader}>
                <Ionicons 
                  name={category.icon} 
                  size={24} 
                  color={expandedCategory === category.id ? theme.primary : theme.text} 
                />
                <Text style={[
                  styles.categoryName,
                  { color: expandedCategory === category.id ? theme.primary : theme.text }
                ]}>
                  {category.name}
                </Text>
              </View>
              <Ionicons 
                name={expandedCategory === category.id ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color={theme.text + '80'} 
              />
            </TouchableOpacity>
            
            {expandedCategory === category.id && (
              <View style={[styles.subCategoriesContainer, { borderLeftColor: theme.primary }]}>
                {getSubCategoriesWithOther(category).map((subCategory) => (
                  <TouchableOpacity
                    key={subCategory.id}
                    style={[
                      styles.subCategoryItem,
                      isSubCategorySelected(subCategory.id) && { backgroundColor: theme.primary + '10' }
                    ]}
                    onPress={() => toggleSubCategory(subCategory.id)}
                  >
                    <View style={styles.checkboxContainer}>
                      <View style={[
                        styles.checkbox,
                        isSubCategorySelected(subCategory.id) && { backgroundColor: theme.primary, borderColor: theme.primary }
                      ]}>
                        {isSubCategorySelected(subCategory.id) && (
                          <Ionicons name="checkmark" size={12} color="white" />
                        )}
                      </View>
                      <Text style={[
                        styles.subCategoryName, 
                        { color: isSubCategorySelected(subCategory.id) ? theme.primary : theme.text }
                      ]}>
                        {subCategory.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    flex: 1,
    height: 300, // Fixed height to ensure it fits
    maxHeight: 300,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    paddingHorizontal: 16,
    fontFamily: 'Roboto',
  },
  categoriesList: {
    paddingHorizontal: 16,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryName: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  subCategoriesContainer: {
    marginLeft: 24,
    paddingLeft: 12,
    borderLeftWidth: 1,
    marginBottom: 12,
  },
  subCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 2,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  subCategoryName: {
    fontSize: 14,
    fontFamily: 'Roboto',
  },
});

export default CategoryFilter; 