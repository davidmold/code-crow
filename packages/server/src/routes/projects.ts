import { Router, Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { ProjectService } from '../services/projectService.js'
import path from 'path'
import type { AddProjectRequest, RemoveProjectRequest, UpdateProjectRequest } from '@code-crow/shared'

const router = Router()

// GET /api/projects - List all projects
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query
  
  let projects
  if (search && typeof search === 'string') {
    projects = await ProjectService.searchProjects(search)
  } else {
    projects = await ProjectService.getProjects()
  }

  res.json({
    success: true,
    data: {
      projects,
      total: projects.length,
      timestamp: new Date().toISOString()
    },
    message: search ? `Found ${projects.length} projects matching "${search}"` : `Retrieved ${projects.length} projects`
  })
}))

// GET /api/projects/browse?path=... - Browse directories for project selection
router.get('/browse', asyncHandler(async (req: Request, res: Response) => {
  const { path: directoryPath = process.cwd() } = req.query as { path?: string }
  
  try {
    const directories = await ProjectService.browseDirectories(directoryPath)
    
    res.json({
      success: true,
      data: {
        currentPath: directoryPath,
        directories,
        parent: directoryPath !== '/' ? path.dirname(directoryPath) : null
      },
      message: `Found ${directories.length} directories in ${directoryPath}`
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        status: 400,
        message: error instanceof Error ? error.message : 'Failed to browse directory',
        code: 'BROWSE_ERROR'
      }
    })
  }
}))

// GET /api/projects/:id - Get specific project
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  
  if (!id) {
    return res.status(400).json({
      success: false,
      error: {
        status: 400,
        message: 'Project ID is required',
        code: 'MISSING_PROJECT_ID'
      }
    })
  }
  
  const project = await ProjectService.getProject(id)
  
  if (!project) {
    return res.status(404).json({
      success: false,
      error: {
        status: 404,
        message: `Project with ID "${id}" not found`,
        code: 'PROJECT_NOT_FOUND'
      }
    })
  }

  return res.json({
    success: true,
    data: {
      project,
      timestamp: new Date().toISOString()
    },
    message: `Retrieved project "${project.name}"`
  })
}))

// GET /api/projects/:id/files - Get project file structure
router.get('/:id/files', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  
  // First check if project exists
  const project = await ProjectService.getProject(id)
  if (!project) {
    return res.status(404).json({
      success: false,
      error: {
        status: 404,
        message: `Project with ID "${id}" not found`,
        code: 'PROJECT_NOT_FOUND'
      }
    })
  }

  const files = await ProjectService.getProjectFiles(id)
  
  res.json({
    success: true,
    data: {
      projectId: id,
      projectName: project.name,
      files,
      fileCount: files.length,
      timestamp: new Date().toISOString()
    },
    message: `Retrieved ${files.length} files for project "${project.name}"`
  })
}))

// POST /api/projects - Add a new project
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const request: AddProjectRequest = req.body
  
  // Validate request
  if (!request.directoryPath) {
    return res.status(400).json({
      success: false,
      error: {
        status: 400,
        message: 'Directory path is required',
        code: 'MISSING_DIRECTORY_PATH'
      }
    })
  }

  const result = await ProjectService.addProject(request)
  
  if (result.success) {
    res.status(201).json({
      success: true,
      data: {
        project: result.project,
        detection: result.detection,
        timestamp: new Date().toISOString()
      },
      message: `Successfully added project "${result.project?.name}"`
    })
  } else {
    res.status(400).json({
      success: false,
      error: {
        status: 400,
        message: result.error || 'Failed to add project',
        code: 'ADD_PROJECT_FAILED'
      }
    })
  }
}))

// DELETE /api/projects/:id - Remove a project
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { deleteFiles = false } = req.body
  
  const request: RemoveProjectRequest = {
    projectId: id,
    deleteFiles
  }
  
  const success = await ProjectService.removeProject(request)
  
  if (success) {
    res.json({
      success: true,
      data: {
        projectId: id,
        timestamp: new Date().toISOString()
      },
      message: 'Project removed successfully'
    })
  } else {
    res.status(404).json({
      success: false,
      error: {
        status: 404,
        message: `Project with ID "${id}" not found`,
        code: 'PROJECT_NOT_FOUND'
      }
    })
  }
}))

// PUT /api/projects/:id - Update a project
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const updates = req.body
  
  const request: UpdateProjectRequest = {
    projectId: id,
    updates
  }
  
  const success = await ProjectService.updateProject(request)
  
  if (success) {
    const updatedProject = await ProjectService.getProject(id)
    res.json({
      success: true,
      data: {
        project: updatedProject,
        timestamp: new Date().toISOString()
      },
      message: 'Project updated successfully'
    })
  } else {
    res.status(404).json({
      success: false,
      error: {
        status: 404,
        message: `Project with ID "${id}" not found`,
        code: 'PROJECT_NOT_FOUND'
      }
    })
  }
}))

// GET /api/projects/:id/content - Get file content
router.get('/:id/content', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { file } = req.query
  
  if (!file || typeof file !== 'string') {
    return res.status(400).json({
      success: false,
      error: {
        status: 400,
        message: 'File path is required',
        code: 'MISSING_FILE_PATH'
      }
    })
  }

  const content = await ProjectService.getFileContent(id, file)
  
  if (content !== null) {
    res.json({
      success: true,
      data: {
        projectId: id,
        filePath: file,
        content,
        timestamp: new Date().toISOString()
      },
      message: `Retrieved content for file "${file}"`
    })
  } else {
    res.status(404).json({
      success: false,
      error: {
        status: 404,
        message: `File "${file}" not found in project`,
        code: 'FILE_NOT_FOUND'
      }
    })
  }
}))

// PUT /api/projects/:id/content - Save file content
router.put('/:id/content', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { file, content } = req.body
  
  if (!file || typeof file !== 'string') {
    return res.status(400).json({
      success: false,
      error: {
        status: 400,
        message: 'File path is required',
        code: 'MISSING_FILE_PATH'
      }
    })
  }

  if (content === undefined || content === null) {
    return res.status(400).json({
      success: false,
      error: {
        status: 400,
        message: 'File content is required',
        code: 'MISSING_FILE_CONTENT'
      }
    })
  }

  const success = await ProjectService.saveFileContent(id, file, content)
  
  if (success) {
    res.json({
      success: true,
      data: {
        projectId: id,
        filePath: file,
        timestamp: new Date().toISOString()
      },
      message: `Successfully saved file "${file}"`
    })
  } else {
    res.status(500).json({
      success: false,
      error: {
        status: 500,
        message: `Failed to save file "${file}"`,
        code: 'SAVE_FILE_FAILED'
      }
    })
  }
}))

// GET /api/projects/:id/stats - Get project statistics
router.get('/:id/stats', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  
  const stats = await ProjectService.getProjectStats(id)
  
  if (stats) {
    res.json({
      success: true,
      data: {
        projectId: id,
        stats,
        timestamp: new Date().toISOString()
      },
      message: 'Retrieved project statistics'
    })
  } else {
    res.status(404).json({
      success: false,
      error: {
        status: 404,
        message: `Project with ID "${id}" not found`,
        code: 'PROJECT_NOT_FOUND'
      }
    })
  }
}))

export default router