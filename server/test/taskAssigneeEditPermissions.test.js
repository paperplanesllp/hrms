import assert from 'assert';
import test from 'node:test';
import mongoose from 'mongoose';

const canEditTask = ({ task, requesterId, role = 'USER' }) => {
  const isAdminOrHR = ['ADMIN', 'HR'].includes(role);
  const isCreator = task.assignedBy?._id?.toString() === requesterId;
  const isAssignee = task.assignedTo?.some(
    (assignee) => assignee?._id?.toString() === requesterId || assignee?.toString() === requesterId
  );

  return isAdminOrHR || isCreator || isAssignee;
};

const getAllowedUpdateFields = (allowTimingUpdate = false) => {
  const fields = [
    'title',
    'description',
    'assignedTo',
    'department',
    'priority',
    'status',
    'progress',
    'tags',
    'isRecurring',
    'recurrencePattern',
    'completionRemarks',
  ];

  if (allowTimingUpdate) {
    fields.push('dueDate', 'estimatedHours', 'estimatedMinutes', 'estimatedTotalMinutes');
  }

  return fields;
};

test('assignee can edit normal task details', () => {
  const task = {
    _id: new mongoose.Types.ObjectId(),
    title: 'Review Financial Report',
    assignedBy: { _id: new mongoose.Types.ObjectId('111111111111111111111111') },
    assignedTo: [
      { _id: new mongoose.Types.ObjectId('222222222222222222222222') },
      { _id: new mongoose.Types.ObjectId('333333333333333333333333') },
    ],
  };

  assert.equal(canEditTask({ task, requesterId: '222222222222222222222222' }), true);

  const allowedFields = getAllowedUpdateFields(false);
  ['title', 'description', 'priority', 'progress'].forEach((field) => {
    assert.equal(allowedFields.includes(field), true, `${field} should be editable`);
  });
});

test('normal edit path keeps timing fields protected', () => {
  const allowedFields = getAllowedUpdateFields(false);

  ['dueDate', 'estimatedHours', 'estimatedMinutes', 'estimatedTotalMinutes'].forEach((field) => {
    assert.equal(allowedFields.includes(field), false, `${field} should not be editable in normal updates`);
  });
});

test('timing fields are editable only through explicit timing update path', () => {
  const allowedFields = getAllowedUpdateFields(true);

  ['dueDate', 'estimatedHours', 'estimatedMinutes', 'estimatedTotalMinutes'].forEach((field) => {
    assert.equal(allowedFields.includes(field), true, `${field} should be editable with allowTimingUpdate`);
  });
});

test('non-assignee, non-creator user cannot edit', () => {
  const task = {
    _id: new mongoose.Types.ObjectId(),
    assignedBy: { _id: new mongoose.Types.ObjectId('111111111111111111111111') },
    assignedTo: [{ _id: new mongoose.Types.ObjectId('222222222222222222222222') }],
  };

  assert.equal(canEditTask({ task, requesterId: '555555555555555555555555' }), false);
});

test('creator and admin/hr can edit', () => {
  const task = {
    _id: new mongoose.Types.ObjectId(),
    assignedBy: { _id: new mongoose.Types.ObjectId('111111111111111111111111') },
    assignedTo: [{ _id: new mongoose.Types.ObjectId('222222222222222222222222') }],
  };

  assert.equal(canEditTask({ task, requesterId: '111111111111111111111111' }), true);
  assert.equal(canEditTask({ task, requesterId: '555555555555555555555555', role: 'ADMIN' }), true);
  assert.equal(canEditTask({ task, requesterId: '555555555555555555555555', role: 'HR' }), true);
});
