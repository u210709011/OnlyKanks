import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES, Category } from '../../services/categories.service';
import { useTheme } from '../../context/theme.context';

interface CategorySelectorProps {
  selectedCategoryId: string | undefined;
  selectedSubCategoryId: string | undefined;
  onCategorySelect: (categoryId: string, subCategoryId?: string) => void;
  onClear: () => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategoryId,
  selectedSubCategoryId,
  onCategorySelect,
  onClear
}) => {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalStep, setModalStep] = useState<'categories' | 'subcategories'>('categories');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Log component state
  console.log("CategorySelector render:", { 
    selectedCategoryId, 
    selectedSubCategoryId,
    modalStep,
    internalSelectedCategoryId: selectedCategory?.id
  });

  // Initialize selected category when props change
  useEffect(() => {
    if (selectedCategoryId) {
      const category = CATEGORIES.find(cat => cat.id === selectedCategoryId);
      setSelectedCategory(category || null);
    } else {
      setSelectedCategory(null);
    }
  }, [selectedCategoryId]);

  // Format display name for selector
  const getDisplayName = () => {
    if (!selectedCategoryId) return 'Select Category';
    
    const category = CATEGORIES.find(cat => cat.id === selectedCategoryId);
    if (!category) return 'Select Category';
    
    if (selectedSubCategoryId) {
      // Handle "Other" subcategory
      if (selectedSubCategoryId === `${category.id}-other`) {
        return `${category.name} > Other`;
      }
      
      const subCategory = category.subCategories.find(sub => sub.id === selectedSubCategoryId);
      return subCategory ? `${category.name} > ${subCategory.name}` : category.name;
    }
    
    return category.name;
  };

  // Open modal and set initial step
  const handleOpenModal = () => {
    if (selectedCategoryId) {
      const category = CATEGORIES.find(cat => cat.id === selectedCategoryId);
      if (category) {
        setSelectedCategory(category);
        setModalStep('subcategories');
      } else {
        setSelectedCategory(null);
        setModalStep('categories');
      }
    } else {
      setSelectedCategory(null);
      setModalStep('categories');
    }
    setModalVisible(true);
  };

  // Handle category selection
  const handleSelectCategory = (category: Category) => {
    console.log("Selecting category:", category.id);
    setSelectedCategory(category);
    setModalStep('subcategories');
  };

  // Handle subcategory selection
  const handleSelectSubcategory = (subcategoryId: string) => {
    if (!selectedCategory) return;
    
    console.log("Selecting subcategory:", { categoryId: selectedCategory.id, subCategoryId: subcategoryId });
    onCategorySelect(selectedCategory.id, subcategoryId);
    setModalVisible(false);
  };

  // Handle back button press
  const handleBack = () => {
    setModalStep('categories');
    setSelectedCategory(null);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setModalVisible(false);
  };

  // Handle clear selection
  const handleClear = () => {
    onClear();
    setSelectedCategory(null);
  };

  // Add "Other" subcategory to each category
  const getSubcategoriesWithOther = (category: Category) => {
    if (!category || !category.subCategories) return [];
    
    const subcategories = [...category.subCategories];
    subcategories.push({ id: `${category.id}-other`, name: 'Other' });
    
    return subcategories;
  };

  const renderCategoriesList = () => {
    return (
      <FlatList
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryItem,
              selectedCategoryId === item.id && { backgroundColor: theme.primary + '20' }
            ]}
            onPress={() => handleSelectCategory(item)}
          >
            <View style={styles.categoryItemContent}>
              <Ionicons 
                name={item.icon} 
                size={24} 
                color={selectedCategoryId === item.id ? theme.primary : theme.text} 
              />
              <Text style={[
                styles.categoryName,
                { color: selectedCategoryId === item.id ? theme.primary : theme.text }
              ]}>
                {item.name}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.text + '80'} />
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={true}
      />
    );
  };

  const renderSubcategoriesList = () => {
    if (!selectedCategory) {
      console.log("No selectedCategory, cannot render subcategories");
      return (
        <View style={{padding: 20}}>
          <Text style={{color: 'red'}}>Error: No category selected</Text>
        </View>
      );
    }
    
    const subcategories = getSubcategoriesWithOther(selectedCategory);
    console.log("Rendering subcategories:", {
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      subcategoriesCount: subcategories.length,
      subcategories: subcategories.map(s => s.name).join(', ')
    });
    
    // Hard-code some categories if there's an issue
    if (subcategories.length === 0) {
      console.log("No subcategories found, using hardcoded ones");
      subcategories.push(
        { id: 'sub1', name: 'Test Subcategory 1' },
        { id: 'sub2', name: 'Test Subcategory 2' },
        { id: 'sub3', name: 'Test Subcategory 3' }
      );
    }
    
    return (
      <View style={{
        flex: 1,
        backgroundColor: theme.background + '90',
        minHeight: 300,
      }}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.card }]}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>Back to Categories</Text>
        </TouchableOpacity>
        
        <View style={{
          backgroundColor: theme.background,
          flex: 1,
          paddingTop: 10,
          minHeight: 250
        }}>
          {subcategories.map(subCategory => (
            <TouchableOpacity
              key={subCategory.id}
              style={[
                styles.subCategoryItem,
                selectedSubCategoryId === subCategory.id && { backgroundColor: theme.primary + '20' }
              ]}
              onPress={() => handleSelectSubcategory(subCategory.id)}
            >
              <Text style={[
                styles.subCategoryName,
                { color: selectedSubCategoryId === subCategory.id ? theme.primary : theme.text }
              ]}>
                {subCategory.name}
              </Text>
              {selectedSubCategoryId === subCategory.id && (
                <Ionicons name="checkmark" size={20} color={theme.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Selector Button */}
      <TouchableOpacity
        style={[
          styles.selector,
          { backgroundColor: theme.input },
          selectedCategoryId ? { borderColor: theme.primary, borderWidth: 1 } : {}
        ]}
        onPress={handleOpenModal}
      >
        <View style={styles.selectorContent}>
          <Ionicons
            name={selectedCategoryId 
              ? CATEGORIES.find(cat => cat.id === selectedCategoryId)?.icon || 'list'
              : 'list'
            }
            size={20}
            color={selectedCategoryId ? theme.primary : theme.text}
            style={styles.icon}
          />
          <Text style={[styles.selectorText, { color: theme.text }]}>
            {getDisplayName()}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={theme.text + '80'} />
      </TouchableOpacity>
      
      {/* Clear Button */}
      {selectedCategoryId && (
        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Ionicons name="close-circle" size={20} color={theme.error} />
          <Text style={[styles.clearText, { color: theme.error }]}>Clear Selection</Text>
        </TouchableOpacity>
      )}
      
      {/* Selection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[
            styles.modalContent, 
            { 
              backgroundColor: theme.background,
              maxHeight: Platform.OS === 'ios' ? '80%' : '90%',
              minHeight: 400,
              flex: 1,
              flexDirection: 'column'
            }
          ]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCloseModal}>
                <Text style={[styles.cancelText, { color: theme.primary }]}>Cancel</Text>
              </TouchableOpacity>
              
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {modalStep === 'subcategories' && selectedCategory 
                  ? `Select ${selectedCategory.name} Subcategory` 
                  : 'Select Category'
                }
              </Text>
              
              <View style={{ width: 60 }} />
            </View>
            
            {/* Modal Content */}
            <View style={{flex: 1}}>
              {modalStep === 'subcategories' && selectedCategory 
                ? renderSubcategoriesList() 
                : renderCategoriesList()
              }
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  selectorText: {
    fontSize: 16,
    fontFamily: 'Roboto',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  clearText: {
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Roboto',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  cancelButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: 'Roboto',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'Roboto',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 16,
    marginLeft: 12,
    fontFamily: 'Roboto',
  },
  subCategoriesContainer: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 8,
  },
  backText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Roboto',
  },
  subCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'transparent',
  },
  subCategoryName: {
    fontSize: 16,
    fontFamily: 'Roboto',
  },
});

export default CategorySelector; 