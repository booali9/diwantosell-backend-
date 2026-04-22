"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableRoles = exports.getAdminStats = exports.toggleAdminStatus = exports.deleteAdmin = exports.updateAdmin = exports.createAdmin = exports.getAdminById = exports.getAdmins = void 0;
const Admin_1 = __importDefault(require("../models/Admin"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// Helper function to safely compare admin IDs
const isSameAdmin = (adminId1, adminId2) => {
    if (!adminId1 || !adminId2)
        return false;
    return adminId1.toString() === adminId2.toString();
};
// @desc    Get all admins
// @route   GET /api/admin/roles/admins
// @access  Private
const getAdmins = async (req, res) => {
    try {
        console.log('[DEBUG] Fetching admins from database...');
        const admins = await Admin_1.default.find()
            .select('-password')
            .sort({ createdAt: -1 });
        console.log('[DEBUG] Found', admins.length, 'admins');
        res.json(admins);
    }
    catch (error) {
        console.error('[ERROR] Get admins error:', error);
        res.status(500).json({
            message: 'Server error getting admins',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAdmins = getAdmins;
// @desc    Get admin by ID
// @route   GET /api/admin/roles/admins/:id
// @access  Private
const getAdminById = async (req, res) => {
    try {
        const admin = await Admin_1.default.findById(req.params.id).select('-password');
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        res.json(admin);
    }
    catch (error) {
        console.error('[ERROR] Get admin by ID error:', error);
        res.status(500).json({
            message: 'Server error getting admin',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAdminById = getAdminById;
// @desc    Create new admin
// @route   POST /api/admin/roles/admins
// @access  Private
const createAdmin = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        // Check if admin already exists
        const existingAdmin = await Admin_1.default.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ message: 'Admin with this email already exists' });
        }
        // Create new admin
        const admin = await Admin_1.default.create({
            name,
            email,
            password,
            role: role || 'admin',
            isActive: true,
        });
        // Return admin without password
        const adminResponse = await Admin_1.default.findById(admin._id).select('-password');
        console.log('[DEBUG] Created new admin:', admin._id);
        res.status(201).json(adminResponse);
    }
    catch (error) {
        console.error('[ERROR] Create admin error:', error);
        res.status(500).json({
            message: 'Server error creating admin',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.createAdmin = createAdmin;
// @desc    Update admin
// @route   PUT /api/admin/roles/admins/:id
// @access  Private
const updateAdmin = async (req, res) => {
    try {
        const admin = await Admin_1.default.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        const { name, email, role, isActive, password } = req.body;
        // Update fields
        if (name)
            admin.name = name;
        if (email)
            admin.email = email;
        if (role)
            admin.role = role;
        if (isActive !== undefined)
            admin.isActive = isActive;
        // Update password if provided
        if (password) {
            const salt = await bcryptjs_1.default.genSalt(10);
            admin.password = await bcryptjs_1.default.hash(password, salt);
        }
        await admin.save();
        const updatedAdmin = await Admin_1.default.findById(admin._id).select('-password');
        console.log('[DEBUG] Updated admin:', req.params.id);
        res.json(updatedAdmin);
    }
    catch (error) {
        console.error('[ERROR] Update admin error:', error);
        res.status(500).json({
            message: 'Server error updating admin',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateAdmin = updateAdmin;
// @desc    Delete admin
// @route   DELETE /api/admin/roles/admins/:id
// @access  Private
const deleteAdmin = async (req, res) => {
    try {
        const admin = await Admin_1.default.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        // Prevent deleting self
        if (isSameAdmin(admin._id, req.admin._id)) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }
        // Prevent deleting the last superadmin
        if (admin.role === 'superadmin') {
            const superAdminCount = await Admin_1.default.countDocuments({ role: 'superadmin' });
            if (superAdminCount <= 1) {
                return res.status(400).json({ message: 'Cannot delete the last super admin' });
            }
        }
        await Admin_1.default.findByIdAndDelete(req.params.id);
        console.log('[DEBUG] Deleted admin:', req.params.id);
        res.json({ message: 'Admin deleted successfully' });
    }
    catch (error) {
        console.error('[ERROR] Delete admin error:', error);
        res.status(500).json({
            message: 'Server error deleting admin',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.deleteAdmin = deleteAdmin;
// @desc    Toggle admin status
// @route   PUT /api/admin/roles/admins/:id/toggle-status
// @access  Private
const toggleAdminStatus = async (req, res) => {
    try {
        const admin = await Admin_1.default.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        // Prevent deactivating self
        if (isSameAdmin(admin._id, req.admin._id)) {
            return res.status(400).json({ message: 'Cannot deactivate your own account' });
        }
        admin.isActive = !admin.isActive;
        await admin.save();
        const updatedAdmin = await Admin_1.default.findById(admin._id).select('-password');
        console.log('[DEBUG] Toggled admin status:', req.params.id, 'to', admin.isActive);
        res.json(updatedAdmin);
    }
    catch (error) {
        console.error('[ERROR] Toggle admin status error:', error);
        res.status(500).json({
            message: 'Server error toggling admin status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.toggleAdminStatus = toggleAdminStatus;
// @desc    Get admin stats
// @route   GET /api/admin/roles/stats
// @access  Private
const getAdminStats = async (req, res) => {
    try {
        console.log('[DEBUG] Fetching admin stats...');
        const totalAdmins = await Admin_1.default.countDocuments();
        const activeAdmins = await Admin_1.default.countDocuments({ isActive: true });
        const inactiveAdmins = await Admin_1.default.countDocuments({ isActive: false });
        // For demo purposes, pending invites is 0 since we don't have an invitation system yet
        const pendingInvites = 0;
        console.log('[DEBUG] Admin stats calculated successfully');
        res.json({
            totalAdmins,
            activeAdmins,
            inactiveAdmins,
            pendingInvites,
        });
    }
    catch (error) {
        console.error('[ERROR] Get admin stats error:', error);
        res.status(500).json({
            message: 'Server error getting admin stats',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAdminStats = getAdminStats;
// @desc    Get available roles
// @route   GET /api/admin/roles/available
// @access  Private
const getAvailableRoles = async (req, res) => {
    try {
        const roles = [
            {
                value: 'superadmin',
                label: 'Super Admin',
                description: 'Full system access and control',
                permissions: ['all']
            },
            {
                value: 'admin',
                label: 'Admin',
                description: 'Administrative access with some restrictions',
                permissions: ['user_management', 'transaction_management', 'kyc_management']
            },
            {
                value: 'manager',
                label: 'Manager',
                description: 'Limited administrative access',
                permissions: ['user_view', 'transaction_view', 'kyc_view']
            },
            {
                value: 'support',
                label: 'Support',
                description: 'Customer support access',
                permissions: ['user_support', 'ticket_management']
            },
            {
                value: 'compliance',
                label: 'Compliance',
                description: 'Compliance and KYC management',
                permissions: ['kyc_management', 'compliance_reports']
            }
        ];
        res.json(roles);
    }
    catch (error) {
        console.error('[ERROR] Get available roles error:', error);
        res.status(500).json({
            message: 'Server error getting available roles',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAvailableRoles = getAvailableRoles;
