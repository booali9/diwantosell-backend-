import { Request, Response } from 'express';
import Admin from '../models/Admin';
import bcrypt from 'bcryptjs';

// Helper function to safely compare admin IDs
const isSameAdmin = (adminId1: any, adminId2: any): boolean => {
    if (!adminId1 || !adminId2) return false;
    return adminId1.toString() === adminId2.toString();
};

// @desc    Get all admins
// @route   GET /api/admin/roles/admins
// @access  Private
export const getAdmins = async (req: Request, res: Response) => {
    try {
        console.log('[DEBUG] Fetching admins from database...');

        const admins = await Admin.find()
            .select('-password')
            .sort({ createdAt: -1 });

        console.log('[DEBUG] Found', admins.length, 'admins');

        res.json(admins);
    } catch (error) {
        console.error('[ERROR] Get admins error:', error);
        res.status(500).json({ 
            message: 'Server error getting admins',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// @desc    Get admin by ID
// @route   GET /api/admin/roles/admins/:id
// @access  Private
export const getAdminById = async (req: Request, res: Response) => {
    try {
        const admin = await Admin.findById(req.params.id).select('-password');

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        res.json(admin);
    } catch (error) {
        console.error('[ERROR] Get admin by ID error:', error);
        res.status(500).json({ 
            message: 'Server error getting admin',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// @desc    Create new admin
// @route   POST /api/admin/roles/admins
// @access  Private
export const createAdmin = async (req: Request, res: Response) => {
    try {
        const { name, email, password, role } = req.body;

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ message: 'Admin with this email already exists' });
        }

        // Create new admin
        const admin = await Admin.create({
            name,
            email,
            password,
            role: role || 'admin',
            isActive: true,
        });

        // Return admin without password
        const adminResponse = await Admin.findById(admin._id).select('-password');

        console.log('[DEBUG] Created new admin:', admin._id);

        res.status(201).json(adminResponse);
    } catch (error) {
        console.error('[ERROR] Create admin error:', error);
        res.status(500).json({ 
            message: 'Server error creating admin',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// @desc    Update admin
// @route   PUT /api/admin/roles/admins/:id
// @access  Private
export const updateAdmin = async (req: Request, res: Response) => {
    try {
        const admin = await Admin.findById(req.params.id);

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        const { name, email, role, isActive, password } = req.body;

        // Update fields
        if (name) admin.name = name;
        if (email) admin.email = email;
        if (role) admin.role = role;
        if (isActive !== undefined) admin.isActive = isActive;
        
        // Update password if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            admin.password = await bcrypt.hash(password, salt);
        }

        await admin.save();

        const updatedAdmin = await Admin.findById(admin._id).select('-password');

        console.log('[DEBUG] Updated admin:', req.params.id);

        res.json(updatedAdmin);
    } catch (error) {
        console.error('[ERROR] Update admin error:', error);
        res.status(500).json({ 
            message: 'Server error updating admin',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// @desc    Delete admin
// @route   DELETE /api/admin/roles/admins/:id
// @access  Private
export const deleteAdmin = async (req: any, res: Response) => {
    try {
        const admin = await Admin.findById(req.params.id);

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Prevent deleting self
        if (isSameAdmin(admin._id, req.admin._id)) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        // Prevent deleting the last superadmin
        if (admin.role === 'superadmin') {
            const superAdminCount = await Admin.countDocuments({ role: 'superadmin' });
            if (superAdminCount <= 1) {
                return res.status(400).json({ message: 'Cannot delete the last super admin' });
            }
        }

        await Admin.findByIdAndDelete(req.params.id);

        console.log('[DEBUG] Deleted admin:', req.params.id);

        res.json({ message: 'Admin deleted successfully' });
    } catch (error) {
        console.error('[ERROR] Delete admin error:', error);
        res.status(500).json({ 
            message: 'Server error deleting admin',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// @desc    Toggle admin status
// @route   PUT /api/admin/roles/admins/:id/toggle-status
// @access  Private
export const toggleAdminStatus = async (req: any, res: Response) => {
    try {
        const admin = await Admin.findById(req.params.id);

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Prevent deactivating self
        if (isSameAdmin(admin._id, req.admin._id)) {
            return res.status(400).json({ message: 'Cannot deactivate your own account' });
        }

        admin.isActive = !admin.isActive;
        await admin.save();

        const updatedAdmin = await Admin.findById(admin._id).select('-password');

        console.log('[DEBUG] Toggled admin status:', req.params.id, 'to', admin.isActive);

        res.json(updatedAdmin);
    } catch (error) {
        console.error('[ERROR] Toggle admin status error:', error);
        res.status(500).json({ 
            message: 'Server error toggling admin status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// @desc    Get admin stats
// @route   GET /api/admin/roles/stats
// @access  Private
export const getAdminStats = async (req: Request, res: Response) => {
    try {
        console.log('[DEBUG] Fetching admin stats...');

        const totalAdmins = await Admin.countDocuments();
        const activeAdmins = await Admin.countDocuments({ isActive: true });
        const inactiveAdmins = await Admin.countDocuments({ isActive: false });
        
        // For demo purposes, pending invites is 0 since we don't have an invitation system yet
        const pendingInvites = 0;

        console.log('[DEBUG] Admin stats calculated successfully');

        res.json({
            totalAdmins,
            activeAdmins,
            inactiveAdmins,
            pendingInvites,
        });
    } catch (error) {
        console.error('[ERROR] Get admin stats error:', error);
        res.status(500).json({ 
            message: 'Server error getting admin stats',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// @desc    Get available roles
// @route   GET /api/admin/roles/available
// @access  Private
export const getAvailableRoles = async (req: Request, res: Response) => {
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
    } catch (error) {
        console.error('[ERROR] Get available roles error:', error);
        res.status(500).json({ 
            message: 'Server error getting available roles',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};