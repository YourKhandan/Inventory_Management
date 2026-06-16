import React, { useState, useEffect } from "react";
import { Picker } from "@react-native-picker/picker";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,Platform
} from "react-native";
import { databases, ID, Query, appwriteConfig } from "./config/appwrite";
import { useColorScheme } from "react-native";

import colors from "./colors";
const App = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(""); // 'create', 'update', 'delete'
  const [selectedItem, setSelectedItem] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Vegetables");
  // Form states
  const [itemName, setItemName] = useState("");
  const [itemQuantity, setItemQuantity] = useState("");

  const deviceTheme = useColorScheme();
  const [manualTheme, setManualTheme] = useState(null);

  const theme = manualTheme || deviceTheme || "light";

  const toggleTheme = () => {
    setManualTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const currentColors = colors[theme];

  const styles = getStyles(currentColors);

  const categories = [
    "Vegetables",
    "Fruits",
    "Dairy",
    "Meat",
    "Bakery",
    "Beverages",
  ];
  // Load inventory on app start
  useEffect(() => {
    fetchInventory();
  }, []);

  // READ: Fetch all inventory items
  const fetchInventory = async () => {
    setLoading(true);
    console.log("🔄 Fetching inventory...");
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.collectionId,
        [Query.orderDesc("$createdAt")],
      );
      console.log("📦 Fetched documents:", response.documents.length, "items");
      console.log("📄 First item example:", response.documents[0]);
      setInventory(response.documents);
    } catch (error) {
      console.error("❌ Fetch error:", error);
      Alert.alert("Error", "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  // CREATE: Add new item
  const createItem = async () => {
  if (!itemName.trim() || !itemQuantity.trim()) {
    Alert.alert("Error", "Please fill in Name and Quantity");
    return;
  }

  setIsSubmitting(true);

  try {
    // 1. Search for existing item (case-insensitive)
    const existing = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.collectionId,
      [Query.equal("Name", itemName.trim())] // exact match first
    );

    // 2. Find case-insensitive match manually
    const match = existing.documents.find(
      (doc) => doc.Name.toLowerCase() === itemName.trim().toLowerCase()
    );

    if (match) {
      // 3. Item exists — ADD to quantity instead of creating new
      const newQuantity = match.Quantity + parseInt(itemQuantity);
      
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collectionId,
        match.$id,
        { Quantity: newQuantity }
      );

      Platform.OS === "web"
        ? window.alert(`Added to existing "${match.Name}" — new quantity: ${newQuantity}`)
        : Alert.alert("Updated", `Added to existing "${match.Name}"\nNew quantity: ${newQuantity}`);

    } else {
      // 4. Item doesn't exist — create fresh
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collectionId,
        ID.unique(),
        {
          Name: itemName.trim(),
          Quantity: parseInt(itemQuantity),
          Category: selectedCategory,
        }
      );

      Platform.OS === "web"
        ? window.alert("Item added successfully")
        : Alert.alert("Success", "Item added successfully");
    }

    closeModal();
    await fetchInventory();

  } catch (error) {
    console.error("Error creating item:", error);
    Platform.OS === "web"
      ? window.alert("Failed to add item")
      : Alert.alert("Error", "Failed to add item");
  } finally {
    setIsSubmitting(false);
  }
};

  // UPDATE: Update item Quantity
  const updateItem = async () => {
    console.log(
      " Updating item:",
      selectedItem.$id,
      "New Quantity:",
      parseInt(itemQuantity),
    );
   if (!itemQuantity.trim() || !itemName.trim()) {
    Platform.OS === "web"
      ? window.alert("Please fill in Name and Quantity")
      : Alert.alert("Error", "Please fill in Name and Quantity");
    return;
  }
      setIsSubmitting(true);
  console.log('✏️ Updating item ID:', selectedItem.$id);
  console.log('✏️ Old data:', selectedItem);
  console.log('✏️ New Quantity:', parseInt(itemQuantity));
    try {
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collectionId,
        selectedItem.$id,
        {
           Name: itemName.trim(),
          Quantity: parseInt(itemQuantity),
        },
      );
      
    Platform.OS === "web"
      ? window.alert("Item updated successfully")
      : Alert.alert("Success", "Item updated successfully");
      closeModal();
      fetchInventory();
    } catch (error) {
      console.error("Error updating item:", error);
      Alert.alert("Error", "Failed to update Quantity");
    }
    finally {
    setIsSubmitting(false);
  }
  };


  const confirmDelete = (item) => {
  if (Platform.OS === "web") {
    // Browser native confirm dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.Name}"?`
    );
    if (confirmed) deleteItem(item);
  } else {
    // Mobile Alert
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete "${item.Name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteItem(item),
        },
      ]
    );
  }
};


  // DELETE: Remove item with confirmation
  const deleteItem = async (itemToDelete) => {
     console.log("🚨 deleteItem CALLED");
  console.log("🚨 itemToDelete:", itemToDelete?.$id);
  console.log("🚨 selectedItem from state:", selectedItem?.$id);
  // Use passed item first, fall back to state
  const target = itemToDelete || selectedItem;

  if (!target || !target.$id) {
    console.error("❌ No item to delete — target:", target);
    Alert.alert("Error", "Cannot delete: item not found");
    return;
  }

  console.log("🗑️ Deleting:", target.$id, target.Name);

  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.collectionId,
      target.$id
    );

    console.log("✅ Deleted successfully:", target.$id);
    Alert.alert("Success", `"${target.Name}" deleted`);
    setModalVisible(false);
    setSelectedItem(null);
    fetchInventory();
  } catch (error) {
    console.error("❌ Delete failed:", error.message);
    console.error("❌ Full error:", JSON.stringify(error, null, 2));
    Alert.alert("Error", `Failed to delete: ${error.message}`);
  }
};
  // Open modal for specific operation
  const openModal = (type, item = null) => {
  console.log("🟡 openModal called — type:", type, "item:", item?.Name);
  
  setModalType(type);
  setSelectedItem(item);

  if (type === "create") {
    console.log("🟡 CREATE branch");
    setItemName("");
    setItemQuantity("");
    setModalVisible(true); // ✅ was missing for create

  } else if (type === "update" && item) {
    console.log("🟡 UPDATE branch");
    setItemQuantity(item.Quantity.toString());
    setItemName(item.Name);
    setModalVisible(true); // ✅ already working for you

  } else if (type === "delete" && item) {
    console.log("🟡 DELETE branch");
    confirmDelete(item);
    return; // ✅ no modal needed for delete
  }
};
  const closeModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
    setItemName("");
    setItemQuantity("");
  };

  // Render each inventory item
  const renderItem = ({ item }) => {
  // Debug log for each rendered item
  console.log('🎨 Rendering item:', {
    id: item.$id,
    Name: item.Name || item.Name,
    Category: item.Category || item.Category,
    Quantity: item.Quantity || item.Quantity,
  });

    return(
    <View style={styles.itemCard}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.Name}</Text>
        <Text style={styles.itemCategory}>Category: {item.Category}</Text>
        <Text style={styles.itemQuantity}>Quantity: {item.Quantity}</Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.updateButton]}
          onPress={() => openModal("update", item)}
        >
          <Text style={styles.buttonText}>Update</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => openModal("delete", item)}
        >
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inventory Management</Text>

      <TouchableOpacity style={styles.themeButton} onPress={toggleTheme}>
        <Text style={styles.themeButtonText}>
          Switch to {theme === "light" ? "Dark" : "Light"} Mode
        </Text>
      </TouchableOpacity>
      {/* Create Button */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => openModal("create")}
      >
        <Text style={styles.createButtonText}>+ Add New Item</Text>
      </TouchableOpacity>
      {/* Inventory List */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : (
        <FlatList
          data={inventory}
          keyExtractor={(item) => item.$id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No items in inventory. Add some!
            </Text>
          }
        />
      )}

      {/* Modal for Create/Update */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
  {modalType === "create" ? "Add New Item" : "Update Item"}
</Text>

{/* Name input — both create and update */}
<TextInput
  style={styles.input}
  placeholder="Item Name (e.g., Potato)"
  value={itemName}
  onChangeText={setItemName}
/>

{/* Category picker — create only */}
{modalType === "create" && (
  <View style={styles.pickerContainer}>
    <Text style={styles.pickerLabel}>Category</Text>
    <Picker
      selectedValue={selectedCategory}
      onValueChange={(itemValue) => setSelectedCategory(itemValue)}
      style={styles.picker}
      dropdownIconColor="#007AFF"
    >
      {categories.map((cat) => (
        <Picker.Item key={cat} label={cat} value={cat} />
      ))}
    </Picker>
  </View>
)}

{/* Quantity input — both create and update */}
<TextInput
  style={styles.input}
  placeholder="Quantity"
  value={itemQuantity}
  onChangeText={setItemQuantity}
  keyboardType="numeric"
/>

{/* Live label showing what's being edited */}
{modalType === "update" && selectedItem && (
  <Text style={styles.updateInfo}>
    Editing: { selectedItem.Name}
  </Text>
)}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeModal}
                disabled={isSubmitting}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.confirmButton,
                  isSubmitting && styles.disabledButton, // dim button when loading
                ]}
                onPress={modalType === "create" ? createItem : updateItem}
                disabled={isSubmitting} // prevent double-click
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.buttonText}>
                    {modalType === "create" ? "Create" : "Update"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (c) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
      paddingTop: 50,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 20,
      color: c.text,
    },
    themeButton: {
      backgroundColor: c.primary,
      marginHorizontal: 20,
      marginBottom: 10,
      padding: 12,
      borderRadius: 8,
      alignItems: "center",
    },
    themeButtonText: {
      color: "#fff", // keep white for contrast on primary button
      fontWeight: "bold",
      fontSize: 16,
    },
    createButton: {
      backgroundColor: c.primary,
      marginHorizontal: 20,
      marginBottom: 20,
      padding: 15,
      borderRadius: 10,
      alignItems: "center",
    },
    createButtonText: {
      color: "#fff",
      fontSize: 18,
      fontWeight: "bold",
    },
    listContainer: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    itemCard: {
      backgroundColor: c.surface,
      borderRadius: 10,
      padding: 15,
      marginBottom: 10,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
      borderWidth: 1,
      borderColor: c.border,
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      fontSize: 18,
      fontWeight: "bold",
      color: c.text,
    },
    itemCategory: {
      fontSize: 14,
      color: c.textSecondary,
      marginTop: 2,
    },
    itemQuantity: {
      fontSize: 16,
      color: c.primary,
      marginTop: 4,
      fontWeight: "600",
    },
    itemActions: {
      flexDirection: "row",
      gap: 10,
    },
    actionButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 5,
      marginLeft: 10,
    },
    updateButton: {
      backgroundColor: c.success,
    },
    deleteButton: {
      backgroundColor: c.danger,
    },
    buttonText: {
      color: "#fff",
      fontWeight: "600",
      fontSize: 14,
    },
    loader: {
      flex: 1,
      justifyContent: "center",
    },
    emptyText: {
      textAlign: "center",
      marginTop: 50,
      fontSize: 16,
      color: c.textSecondary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: c.modalOverlay,
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: c.surfaceElevated,
      borderRadius: 15,
      padding: 20,
      width: "85%",
      maxWidth: 400,
      borderWidth: 1,
      borderColor: c.border,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: "bold",
      marginBottom: 20,
      textAlign: "center",
      color: c.text,
    },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 15,
      fontSize: 16,
      backgroundColor: c.surface,
      color: c.text,
    },
    pickerContainer: {
      marginBottom: 15,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: c.surface,
    },
    pickerLabel: {
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 12,
      marginTop: 8,
      marginBottom: 2,
      color: c.textSecondary,
    },
    picker: {
      height: 50,
      width: "100%",
      color: c.text,
    },
    updateInfo: {
      fontSize: 14,
      color: c.primary,
      marginBottom: 15,
      textAlign: "center",
    },
    modalButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 10,
      gap: 10,
    },
    modalButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      alignItems: "center",
    },
    cancelButton: {
      backgroundColor: c.danger,
    },
    confirmButton: {
      backgroundColor: c.success,
    },
    disabledButton: {
      opacity: 0.6,
    },
  });

export default App;
